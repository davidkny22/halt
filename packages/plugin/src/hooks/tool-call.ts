import { buildEvent } from "../event-builder.js";
import type { HttpsSender } from "../transport/https-sender.js";
import type { RateTracker } from "../severity.js";
import { killState } from "../kill-switch/kill-state.js";
import type { LocalFailsafe } from "../kill-switch/local-failsafe.js";
import type { RuleCache } from "../rule-cache.js";
import type { ViolationTracker } from "../auto-kill.js";
import type { ShieldScanner } from "../shield/scanner.js";
import { getSubagentInfo } from "../subagent-context.js";

interface ToolCallContext {
  sender: HttpsSender;
  rateTracker: RateTracker;
  redactionPatterns: string[];
  getFailsafe: (agentId: string) => LocalFailsafe;
  ruleCache: RuleCache;
  getViolationTracker: (agentId: string) => ViolationTracker;
  shieldScanner: ShieldScanner;
  resolveAgentId: (event: any, ocCtx?: any) => string;
  resolveSessionId: (event: any, ocCtx?: any, agentId?: string) => string;
}

export function createBeforeToolCallHandler(ctx: ToolCallContext) {
  return (event: any, ocCtx?: any) => {
    const agentId = ctx.resolveAgentId(event, ocCtx);
    const sessionId = ctx.resolveSessionId(event, ocCtx, agentId);
    const sub = getSubagentInfo(event, sessionId);
    ctx.rateTracker.record();
    ctx.getFailsafe(agentId).recordToolCall();

    // Record event in rule cache for time-window based rules (per-agent)
    ctx.ruleCache.recordEvent({
      timestamp: Date.now(),
      toolName: event.toolName,
      eventType: "tool_use",
      costUsd: event.cost,
      action: event.toolName,
      target: event.toolName,
    }, agentId);

    // Build a descriptive action label from tool name + params
    const toolName = event.toolName || "unknown";
    const paramHint = event.params?.command
      ? `: ${String(event.params.command).slice(0, 80)}`
      : event.params?.url
      ? `: ${String(event.params.url).slice(0, 80)}`
      : event.params?.file_path
      ? `: ${String(event.params.file_path).slice(0, 80)}`
      : event.params?.action
      ? `: ${String(event.params.action).slice(0, 80)}`
      : "";

    const haltEvent = buildEvent({
      agentId,
      sessionId: sub.sessionId,
      eventType: "tool_use",
      action: `${toolName}${paramHint}`,
      target: toolName,
      metadata: {
        tool_name: toolName,
        ...(sub.subagentId ? { subagent_id: sub.subagentId } : {}),
        ...(event.params ? { raw_snippet: JSON.stringify(event.params).slice(0, 500) } : {}),
      },
      rateTracker: ctx.rateTracker,
      customRedactionPatterns: ctx.redactionPatterns,
    });

    ctx.sender.enqueue(haltEvent);

    // Helper: capture a blocked event
    const captureBlocked = (reason: string, source: string) => {
      const blockedEvent = buildEvent({
        agentId,
        sessionId: sub.sessionId,
        eventType: "tool_use",
        action: `BLOCKED: ${toolName}${paramHint}`,
        target: toolName,
        metadata: {
          tool_name: toolName,
          blocked: true,
          block_reason: reason,
          block_source: source,
          ...(sub.subagentId ? { subagent_id: sub.subagentId } : {}),
        },
        rateTracker: ctx.rateTracker,
        customRedactionPatterns: ctx.redactionPatterns,
      });
      ctx.sender.enqueue(blockedEvent);
    };

    // 1. Check kill state (server-triggered, per-agent)
    if (killState.isKilled(agentId)) {
      const reason = `halt: agent paused — ${killState.getReason(agentId) || "unknown reason"}`;
      captureBlocked(reason, "kill-state");
      return { block: true, blockReason: reason };
    }

    // 2. Check local failsafe (spend/rate/blocklist)
    const failsafeResult = ctx.getFailsafe(agentId).check(event.toolName || "");
    if (failsafeResult.block) {
      captureBlocked(failsafeResult.reason, "failsafe");
      killState.setKilled(failsafeResult.reason, agentId);
      return { block: true, blockReason: failsafeResult.reason };
    }

    // 3. Shield input scan (injection detection)
    const shieldConfig = ctx.ruleCache.getShieldConfig();
    ctx.shieldScanner.updateConfig(shieldConfig);
    const shieldResult = ctx.shieldScanner.scanInput(toolName, event.params);
    if (shieldResult.detected) {
      const shieldReason = `Shield: ${shieldResult.detections[0]?.description || "injection detected"} [${shieldResult.highestSeverity}]`;

      if (shieldResult.shouldBlock) {
        captureBlocked(shieldReason, `shield:${shieldResult.highestSeverity}`);

        // Record violation for auto-kill
        ctx.getViolationTracker(agentId).recordViolation({
          ruleId: `shield:${shieldResult.highestSeverity}`,
          ruleName: `Shield: ${shieldResult.highestSeverity}`,
          timestamp: Date.now(),
          action: toolName,
          target: toolName,
        });

        return { block: true, blockReason: shieldReason };
      } else {
        // Alert-only: send shield event but don't block
        const alertEvent = buildEvent({
          agentId,
          sessionId: sub.sessionId,
          eventType: "tool_use",
          action: `SHIELD: ${toolName}${paramHint}`,
          target: toolName,
          metadata: {
            tool_name: toolName,
            shield_detection: true,
            shield_category: shieldResult.detections[0]?.category,
            shield_severity: shieldResult.highestSeverity,
            shield_patterns: shieldResult.detections.map((d) => d.patternName),
            ...(sub.subagentId ? { subagent_id: sub.subagentId } : {}),
          } as any,
          rateTracker: ctx.rateTracker,
          customRedactionPatterns: ctx.redactionPatterns,
        });
        ctx.sender.enqueue(alertEvent);
      }
    }

    // 4. Check cached server rules locally (PRE-ACTION for pattern rules)
    const ruleResult = ctx.ruleCache.checkBeforeToolCall(
      event.toolName || "",
      event.params,
      agentId
    );
    if (ruleResult.blocked) {
      captureBlocked(ruleResult.reason || "Rule matched", `rule:${ruleResult.ruleName}`);

      // Record violation for auto-kill tracking
      const autoKillResult = ctx.getViolationTracker(agentId).recordViolation({
        ruleId: ruleResult.ruleName || "unknown",
        ruleName: ruleResult.ruleName || "unknown",
        timestamp: Date.now(),
        action: event.toolName || "unknown",
        target: event.toolName || "unknown",
      });

      if (autoKillResult.shouldKill) {
        killState.setKilled(autoKillResult.message, agentId);
        return { block: true, blockReason: autoKillResult.message };
      }

      return { block: true, blockReason: ruleResult.reason };
    }

    return undefined;
  };
}

export function createAfterToolCallHandler(ctx: ToolCallContext) {
  return (event: any, ocCtx?: any) => {
    const agentId = ctx.resolveAgentId(event, ocCtx);
    const sessionId = ctx.resolveSessionId(event, ocCtx, agentId);
    const sub = getSubagentInfo(event, sessionId);

    // Track spend for failsafe and rule cache
    if (typeof event.cost === "number") {
      ctx.getFailsafe(agentId).addSpend(event.cost);
      ctx.ruleCache.recordEvent({
        timestamp: Date.now(),
        toolName: event.toolName,
        eventType: "tool_use",
        costUsd: event.cost,
      }, agentId);
    }

    const afterToolName = event.toolName || "unknown";

    // Shield output scan — detect indirect injection in tool results
    const outputResult = ctx.shieldScanner.scanOutput(afterToolName, event.result);
    if (outputResult.detected) {
      const alertEvent = buildEvent({
        agentId,
        sessionId: sub.sessionId,
        eventType: "tool_use",
        action: `SHIELD: output injection in ${afterToolName}`,
        target: afterToolName,
        metadata: {
          tool_name: afterToolName,
          shield_detection: true,
          shield_category: outputResult.detections[0]?.category,
          shield_severity: outputResult.highestSeverity,
          shield_patterns: outputResult.detections.map((d) => d.patternName),
          block_source: "shield:output",
          ...(sub.subagentId ? { subagent_id: sub.subagentId } : {}),
        } as any,
        rateTracker: ctx.rateTracker,
        customRedactionPatterns: ctx.redactionPatterns,
      });
      ctx.sender.enqueue(alertEvent);

      // Record violation for auto-kill escalation
      ctx.getViolationTracker(agentId).recordViolation({
        ruleId: `shield:output:${outputResult.highestSeverity}`,
        ruleName: `Shield: output ${outputResult.highestSeverity}`,
        timestamp: Date.now(),
        action: afterToolName,
        target: afterToolName,
      });
    }

    const haltEvent = buildEvent({
      agentId,
      sessionId: sub.sessionId,
      eventType: "tool_use",
      action: `${afterToolName} completed${event.error ? " (error)" : ""}`,
      target: afterToolName,
      metadata: {
        tool_name: afterToolName,
        duration_ms: event.duration,
        error: event.error?.message,
        cost_usd: event.cost,
        raw_snippet: event.result ? String(event.result).slice(0, 500) : undefined,
        ...(sub.subagentId ? { subagent_id: sub.subagentId } : {}),
      },
      rateTracker: ctx.rateTracker,
      customRedactionPatterns: ctx.redactionPatterns,
    });

    ctx.sender.enqueue(haltEvent);
  };
}

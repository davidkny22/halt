import { buildEvent } from "../event-builder.js";
import type { HttpsSender } from "../transport/https-sender.js";
import type { RateTracker } from "../severity.js";
import { killState } from "../kill-switch/kill-state.js";
import type { LocalFailsafe } from "../kill-switch/local-failsafe.js";
import type { RuleCache } from "../rule-cache.js";
import type { ViolationTracker } from "../auto-kill.js";
import { getSubagentInfo } from "../subagent-context.js";

interface ToolCallContext {
  agentId: string;
  sessionId: string;
  sender: HttpsSender;
  rateTracker: RateTracker;
  redactionPatterns: string[];
  failsafe: LocalFailsafe;
  ruleCache: RuleCache;
  violationTracker: ViolationTracker;
}

export function createBeforeToolCallHandler(ctx: ToolCallContext) {
  return (event: any) => {
    // Resolve agent ID from session key on first event
    (ctx as any).resolveAgentFromEvent?.(event);
    const sub = getSubagentInfo(event, ctx.sessionId);
    ctx.rateTracker.record();
    ctx.failsafe.recordToolCall();

    // Record event in rule cache for time-window based rules
    ctx.ruleCache.recordEvent({
      timestamp: Date.now(),
      toolName: event.toolName,
      eventType: "tool_use",
      costUsd: event.cost,
      action: event.toolName,
      target: event.toolName,
    });

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

    const clawnitorEvent = buildEvent({
      agentId: ctx.agentId,
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

    ctx.sender.enqueue(clawnitorEvent);

    // Helper: capture a blocked event
    const captureBlocked = (reason: string, source: string) => {
      const blockedEvent = buildEvent({
        agentId: ctx.agentId,
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

    // 1. Check kill state (server-triggered)
    if (killState.isKilled()) {
      const reason = `Clawnitor: agent paused — ${killState.getReason() || "unknown reason"}`;
      captureBlocked(reason, "kill-state");
      return { block: true, blockReason: reason };
    }

    // 2. Check local failsafe (spend/rate/blocklist)
    const failsafeResult = ctx.failsafe.check(event.toolName || "");
    if (failsafeResult.block) {
      captureBlocked(failsafeResult.reason, "failsafe");
      killState.setKilled(failsafeResult.reason);
      return { block: true, blockReason: failsafeResult.reason };
    }

    // 3. Check cached server rules locally (PRE-ACTION for pattern rules)
    const ruleResult = ctx.ruleCache.checkBeforeToolCall(
      event.toolName || "",
      event.params
    );
    if (ruleResult.blocked) {
      captureBlocked(ruleResult.reason || "Rule matched", `rule:${ruleResult.ruleName}`);

      // Record violation for auto-kill tracking
      const autoKillResult = ctx.violationTracker.recordViolation({
        ruleId: ruleResult.ruleName || "unknown",
        ruleName: ruleResult.ruleName || "unknown",
        timestamp: Date.now(),
        action: event.toolName || "unknown",
        target: event.toolName || "unknown",
      });

      if (autoKillResult.shouldKill) {
        killState.setKilled(autoKillResult.message);
        return { block: true, blockReason: autoKillResult.message };
      }

      return { block: true, blockReason: ruleResult.reason };
    }

    return undefined;
  };
}

export function createAfterToolCallHandler(ctx: ToolCallContext) {
  return (event: any) => {
    const sub = getSubagentInfo(event, ctx.sessionId);

    // Track spend for failsafe and rule cache
    if (typeof event.cost === "number") {
      ctx.failsafe.addSpend(event.cost);
      ctx.ruleCache.recordEvent({
        timestamp: Date.now(),
        toolName: event.toolName,
        eventType: "tool_use",
        costUsd: event.cost,
      });
    }

    const afterToolName = event.toolName || "unknown";

    const clawnitorEvent = buildEvent({
      agentId: ctx.agentId,
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

    ctx.sender.enqueue(clawnitorEvent);
  };
}

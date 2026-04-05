import { buildEvent } from "../event-builder.js";
import type { HttpsSender } from "../transport/https-sender.js";
import type { RateTracker } from "../severity.js";
import { killState } from "../kill-switch/kill-state.js";
import type { LocalFailsafe } from "../kill-switch/local-failsafe.js";
import type { RuleCache } from "../rule-cache.js";

interface ToolCallContext {
  agentId: string;
  sessionId: string;
  sender: HttpsSender;
  rateTracker: RateTracker;
  redactionPatterns: string[];
  failsafe: LocalFailsafe;
  ruleCache: RuleCache;
}

export function createBeforeToolCallHandler(ctx: ToolCallContext) {
  return (event: any) => {
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

    const clawnitorEvent = buildEvent({
      agentId: ctx.agentId,
      sessionId: ctx.sessionId,
      eventType: "tool_use",
      action: `before: ${event.toolName || "unknown"}`,
      target: event.toolName || "unknown",
      metadata: {
        tool_name: event.toolName,
        ...(event.params ? { raw_snippet: JSON.stringify(event.params).slice(0, 500) } : {}),
      },
      rateTracker: ctx.rateTracker,
      customRedactionPatterns: ctx.redactionPatterns,
    });

    ctx.sender.enqueue(clawnitorEvent);

    // 1. Check kill state (server-triggered)
    if (killState.isKilled()) {
      return {
        block: true,
        blockReason: `Clawnitor: agent paused — ${killState.getReason() || "unknown reason"}`,
      };
    }

    // 2. Check local failsafe (spend/rate/blocklist)
    const failsafeResult = ctx.failsafe.check(event.toolName || "");
    if (failsafeResult.block) {
      killState.setKilled(failsafeResult.reason);
      return {
        block: true,
        blockReason: failsafeResult.reason,
      };
    }

    // 3. Check cached server rules locally (PRE-ACTION for pattern rules)
    const ruleResult = ctx.ruleCache.checkBeforeToolCall(
      event.toolName || "",
      event.params
    );
    if (ruleResult.blocked) {
      killState.setKilled(ruleResult.reason || "Rule triggered");
      return {
        block: true,
        blockReason: ruleResult.reason,
      };
    }

    return undefined;
  };
}

export function createAfterToolCallHandler(ctx: ToolCallContext) {
  return (event: any) => {
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

    const clawnitorEvent = buildEvent({
      agentId: ctx.agentId,
      sessionId: ctx.sessionId,
      eventType: "tool_use",
      action: `after: ${event.toolName || "unknown"}`,
      target: event.toolName || "unknown",
      metadata: {
        tool_name: event.toolName,
        duration_ms: event.duration,
        error: event.error?.message,
        cost_usd: event.cost,
        raw_snippet: event.result ? String(event.result).slice(0, 500) : undefined,
      },
      rateTracker: ctx.rateTracker,
      customRedactionPatterns: ctx.redactionPatterns,
    });

    ctx.sender.enqueue(clawnitorEvent);
  };
}

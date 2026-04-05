import { buildEvent } from "../event-builder.js";
import type { HttpsSender } from "../transport/https-sender.js";

interface LifecycleContext {
  sender: HttpsSender;
  redactionPatterns: string[];
  resolveAgentId: (event: any, ocCtx?: any) => string;
  resolveSessionId: (event: any, ocCtx?: any, agentId?: string) => string;
  onSessionStart?: () => void;
  onAgentEnd?: (agentId: string) => void;
}

export function createSessionStartHandler(ctx: LifecycleContext) {
  return (event: any, ocCtx?: any) => {
    const agentId = ctx.resolveAgentId(event, ocCtx);
    const sessionId = ctx.resolveSessionId(event, ocCtx, agentId);
    ctx.onSessionStart?.();

    const haltEvent = buildEvent({
      agentId,
      sessionId,
      eventType: "agent_lifecycle",
      action: "session started",
      target: "session",
      metadata: {},
      customRedactionPatterns: ctx.redactionPatterns,
    });

    ctx.sender.enqueue(haltEvent);
  };
}

export function createSessionEndHandler(ctx: LifecycleContext) {
  return (event: any, ocCtx?: any) => {
    const agentId = ctx.resolveAgentId(event, ocCtx);
    const sessionId = ctx.resolveSessionId(event, ocCtx, agentId);

    const haltEvent = buildEvent({
      agentId,
      sessionId,
      eventType: "agent_lifecycle",
      action: "session ended",
      target: "session",
      metadata: {
        duration_ms: event.duration,
      },
      customRedactionPatterns: ctx.redactionPatterns,
    });

    ctx.sender.enqueue(haltEvent);
  };
}

export function createAgentEndHandler(ctx: LifecycleContext) {
  return (event: any, ocCtx?: any) => {
    const agentId = ctx.resolveAgentId(event, ocCtx);
    const sessionId = ctx.resolveSessionId(event, ocCtx, agentId);

    const haltEvent = buildEvent({
      agentId,
      sessionId,
      eventType: "agent_lifecycle",
      action: event.error ? "agent ended with error" : "agent ended",
      target: "agent",
      metadata: {
        duration_ms: event.duration,
        error: event.error?.message,
      },
      customRedactionPatterns: ctx.redactionPatterns,
    });

    ctx.sender.enqueue(haltEvent);

    // Mark session boundary — next events from this agent get a new session
    ctx.onAgentEnd?.(agentId);
  };
}

export function createSubagentHandlers(ctx: LifecycleContext) {
  return {
    spawning: (event: any, ocCtx?: any) => {
      const agentId = ctx.resolveAgentId(event, ocCtx);
      const sessionId = ctx.resolveSessionId(event, ocCtx, agentId);
      const subagentId = event.subagentId || event.childSessionKey || "unknown";
      const haltEvent = buildEvent({
        agentId,
        sessionId,
        eventType: "subagent",
        action: "subagent spawning",
        target: subagentId,
        metadata: {
          subagent_id: subagentId,
          raw_snippet: event.label || event.task
            ? `${event.label || "subagent"}: ${(event.task || "").slice(0, 450)}`
            : undefined,
        },
        customRedactionPatterns: ctx.redactionPatterns,
      });
      ctx.sender.enqueue(haltEvent);
    },
    ended: (event: any, ocCtx?: any) => {
      const agentId = ctx.resolveAgentId(event, ocCtx);
      const sessionId = ctx.resolveSessionId(event, ocCtx, agentId);
      const subagentId = event.subagentId || event.childSessionKey || "unknown";
      const haltEvent = buildEvent({
        agentId,
        sessionId,
        eventType: "subagent",
        action: "subagent ended",
        target: subagentId,
        metadata: {
          subagent_id: subagentId,
          duration_ms: event.duration || event.runtimeMs,
        },
        customRedactionPatterns: ctx.redactionPatterns,
      });
      ctx.sender.enqueue(haltEvent);
    },
  };
}

import { buildEvent } from "../event-builder.js";
import type { HttpsSender } from "../transport/https-sender.js";

interface LifecycleContext {
  agentId: string;
  sessionId: string;
  sender: HttpsSender;
  redactionPatterns: string[];
  onSessionStart?: (sessionId: string) => void;
  onSessionEnd?: (sessionId: string) => void;
}

export function createSessionStartHandler(ctx: LifecycleContext) {
  return (event: any) => {
    ctx.onSessionStart?.(event.sessionId || ctx.sessionId);

    const clawnitorEvent = buildEvent({
      agentId: ctx.agentId,
      sessionId: event.sessionId || ctx.sessionId,
      eventType: "agent_lifecycle",
      action: "session started",
      target: "session",
      metadata: {},
      customRedactionPatterns: ctx.redactionPatterns,
    });

    ctx.sender.enqueue(clawnitorEvent);
  };
}

export function createSessionEndHandler(ctx: LifecycleContext) {
  return (event: any) => {
    ctx.onSessionEnd?.(event.sessionId || ctx.sessionId);

    const clawnitorEvent = buildEvent({
      agentId: ctx.agentId,
      sessionId: event.sessionId || ctx.sessionId,
      eventType: "agent_lifecycle",
      action: "session ended",
      target: "session",
      metadata: {
        duration_ms: event.duration,
      },
      customRedactionPatterns: ctx.redactionPatterns,
    });

    ctx.sender.enqueue(clawnitorEvent);
  };
}

export function createAgentEndHandler(ctx: LifecycleContext) {
  return (event: any) => {
    const clawnitorEvent = buildEvent({
      agentId: ctx.agentId,
      sessionId: ctx.sessionId,
      eventType: "agent_lifecycle",
      action: event.error ? "agent ended with error" : "agent ended",
      target: "agent",
      metadata: {
        duration_ms: event.duration,
        error: event.error?.message,
      },
      customRedactionPatterns: ctx.redactionPatterns,
    });

    ctx.sender.enqueue(clawnitorEvent);
  };
}

export function createSubagentHandlers(ctx: LifecycleContext) {
  return {
    spawning: (event: any) => {
      const subagentId = event.subagentId || event.childSessionKey || "unknown";
      const clawnitorEvent = buildEvent({
        agentId: ctx.agentId,
        sessionId: ctx.sessionId,
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
      ctx.sender.enqueue(clawnitorEvent);
    },
    ended: (event: any) => {
      const subagentId = event.subagentId || event.childSessionKey || "unknown";
      const clawnitorEvent = buildEvent({
        agentId: ctx.agentId,
        sessionId: ctx.sessionId,
        eventType: "subagent",
        action: "subagent ended",
        target: subagentId,
        metadata: {
          subagent_id: subagentId,
          duration_ms: event.duration || event.runtimeMs,
        },
        customRedactionPatterns: ctx.redactionPatterns,
      });
      ctx.sender.enqueue(clawnitorEvent);
    },
  };
}

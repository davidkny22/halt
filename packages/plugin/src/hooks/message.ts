import { buildEvent } from "../event-builder.js";
import type { HttpsSender } from "../transport/https-sender.js";
import { killState } from "../kill-switch/kill-state.js";
import { getSubagentInfo } from "../subagent-context.js";

interface MessageContext {
  sender: HttpsSender;
  redactionPatterns: string[];
  resolveAgentId: (event: any, ocCtx?: any) => string;
  resolveSessionId: (event: any, ocCtx?: any, agentId?: string) => string;
}

export function createMessageSendingHandler(ctx: MessageContext) {
  return (event: any, ocCtx?: any) => {
    const agentId = ctx.resolveAgentId(event, ocCtx);
    if (killState.isKilled(agentId)) {
      return { cancel: true };
    }
    const sessionId = ctx.resolveSessionId(event, ocCtx, agentId);
    const sub = getSubagentInfo(event, sessionId);
    const clawnitorEvent = buildEvent({
      agentId,
      sessionId: sub.sessionId,
      eventType: "message_sent",
      action: "sending message",
      target: event.channel || "unknown",
      metadata: {
        raw_snippet: event.text ? String(event.text).slice(0, 500) : undefined,
        ...(sub.subagentId ? { subagent_id: sub.subagentId } : {}),
      },
      customRedactionPatterns: ctx.redactionPatterns,
    });

    ctx.sender.enqueue(clawnitorEvent);
    return undefined;
  };
}

export function createMessageSentHandler(ctx: MessageContext) {
  return (event: any, ocCtx?: any) => {
    const agentId = ctx.resolveAgentId(event, ocCtx);
    const sessionId = ctx.resolveSessionId(event, ocCtx, agentId);
    const sub = getSubagentInfo(event, sessionId);
    const clawnitorEvent = buildEvent({
      agentId,
      sessionId: sub.sessionId,
      eventType: "message_sent",
      action: "message sent",
      target: event.channel || "unknown",
      metadata: {
        ...(sub.subagentId ? { subagent_id: sub.subagentId } : {}),
      },
      customRedactionPatterns: ctx.redactionPatterns,
    });

    ctx.sender.enqueue(clawnitorEvent);
  };
}

export function createMessageReceivedHandler(ctx: MessageContext) {
  return (event: any, ocCtx?: any) => {
    const agentId = ctx.resolveAgentId(event, ocCtx);
    const sessionId = ctx.resolveSessionId(event, ocCtx, agentId);
    const sub = getSubagentInfo(event, sessionId);
    const clawnitorEvent = buildEvent({
      agentId,
      sessionId: sub.sessionId,
      eventType: "message_received",
      action: "message received",
      target: event.channel || "unknown",
      metadata: {
        ...(sub.subagentId ? { subagent_id: sub.subagentId } : {}),
      },
      customRedactionPatterns: ctx.redactionPatterns,
    });

    ctx.sender.enqueue(clawnitorEvent);
  };
}

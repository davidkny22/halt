import { buildEvent } from "../event-builder.js";
import type { HttpsSender } from "../transport/https-sender.js";
import { killState } from "../kill-switch/kill-state.js";

interface MessageContext {
  agentId: string;
  sessionId: string;
  sender: HttpsSender;
  redactionPatterns: string[];
}

export function createMessageSendingHandler(ctx: MessageContext) {
  return (event: any) => {
    // Check kill state BEFORE enqueueing — don't log blocked messages as sent
    if (killState.isKilled()) {
      return { cancel: true };
    }

    const clawnitorEvent = buildEvent({
      agentId: ctx.agentId,
      sessionId: ctx.sessionId,
      eventType: "message_sent",
      action: `sending message`,
      target: event.channel || "unknown",
      metadata: {
        raw_snippet: event.text ? String(event.text).slice(0, 500) : undefined,
      },
      customRedactionPatterns: ctx.redactionPatterns,
    });

    ctx.sender.enqueue(clawnitorEvent);
    return undefined;
  };
}

export function createMessageSentHandler(ctx: MessageContext) {
  return (event: any) => {
    const clawnitorEvent = buildEvent({
      agentId: ctx.agentId,
      sessionId: ctx.sessionId,
      eventType: "message_sent",
      action: `message sent`,
      target: event.channel || "unknown",
      metadata: {},
      customRedactionPatterns: ctx.redactionPatterns,
    });

    ctx.sender.enqueue(clawnitorEvent);
  };
}

export function createMessageReceivedHandler(ctx: MessageContext) {
  return (event: any) => {
    const clawnitorEvent = buildEvent({
      agentId: ctx.agentId,
      sessionId: ctx.sessionId,
      eventType: "message_received",
      action: `message received`,
      target: event.channel || "unknown",
      metadata: {},
      customRedactionPatterns: ctx.redactionPatterns,
    });

    ctx.sender.enqueue(clawnitorEvent);
  };
}

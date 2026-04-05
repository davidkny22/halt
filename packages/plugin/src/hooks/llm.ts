import { buildEvent } from "../event-builder.js";
import type { HttpsSender } from "../transport/https-sender.js";
import { getSubagentInfo } from "../subagent-context.js";

interface LlmContext {
  agentId: string;
  sessionId: string;
  sender: HttpsSender;
  redactionPatterns: string[];
}

export function createLlmInputHandler(ctx: LlmContext) {
  return (event: any) => {
    const sub = getSubagentInfo(event, ctx.sessionId);
    const clawnitorEvent = buildEvent({
      agentId: ctx.agentId,
      sessionId: sub.sessionId,
      eventType: "llm_call",
      action: `llm_input: ${event.model || "unknown"}`,
      target: event.provider || "unknown",
      metadata: {
        tool_name: event.model,
        ...(sub.subagentId ? { subagent_id: sub.subagentId } : {}),
      },
      customRedactionPatterns: ctx.redactionPatterns,
    });

    ctx.sender.enqueue(clawnitorEvent);
  };
}

export function createLlmOutputHandler(ctx: LlmContext) {
  return (event: any) => {
    const sub = getSubagentInfo(event, ctx.sessionId);
    const clawnitorEvent = buildEvent({
      agentId: ctx.agentId,
      sessionId: sub.sessionId,
      eventType: "llm_call",
      action: `llm_output: ${event.model || "unknown"}`,
      target: event.provider || "unknown",
      metadata: {
        tokens_used: event.usage?.totalTokens,
        cost_usd: event.usage?.cost,
        ...(sub.subagentId ? { subagent_id: sub.subagentId } : {}),
      },
      customRedactionPatterns: ctx.redactionPatterns,
    });

    ctx.sender.enqueue(clawnitorEvent);
  };
}

import { buildEvent } from "../event-builder.js";
import type { HttpsSender } from "../transport/https-sender.js";
import { getSubagentInfo } from "../subagent-context.js";

interface LlmContext {
  sender: HttpsSender;
  redactionPatterns: string[];
  resolveAgentId: (event: any, ocCtx?: any) => string;
  resolveSessionId: (event: any, ocCtx?: any, agentId?: string) => string;
}

export function createLlmInputHandler(ctx: LlmContext) {
  return (event: any, ocCtx?: any) => {
    const agentId = ctx.resolveAgentId(event, ocCtx);
    const sessionId = ctx.resolveSessionId(event, ocCtx, agentId);
    const sub = getSubagentInfo(event, sessionId);

    const clawnitorEvent = buildEvent({
      agentId,
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
  return (event: any, ocCtx?: any) => {
    const agentId = ctx.resolveAgentId(event, ocCtx);
    const sessionId = ctx.resolveSessionId(event, ocCtx, agentId);
    const sub = getSubagentInfo(event, sessionId);

    const clawnitorEvent = buildEvent({
      agentId,
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

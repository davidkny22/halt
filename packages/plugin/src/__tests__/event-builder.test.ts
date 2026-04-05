import { describe, it, expect } from "vitest";
import { buildEvent } from "../event-builder.js";
import { clawnitorEventSchema } from "@clawnitor/shared";

describe("buildEvent", () => {
  it("produces a valid ClawnitorEvent", () => {
    const event = buildEvent({
      agentId: "agent-1",
      sessionId: "session-1",
      eventType: "tool_use",
      action: "called send_email",
      target: "gmail_api",
      metadata: { tool_name: "send_email" },
    });

    const result = clawnitorEventSchema.safeParse(event);
    expect(result.success).toBe(true);
  });

  it("generates unique event IDs", () => {
    const ids = new Set(
      Array.from({ length: 20 }, () =>
        buildEvent({
          agentId: "a",
          sessionId: "s",
          eventType: "tool_use",
          action: "test",
          target: "test",
        }).event_id
      )
    );
    expect(ids.size).toBe(20);
  });

  it("truncates raw_snippet to 500 chars", () => {
    const event = buildEvent({
      agentId: "a",
      sessionId: "s",
      eventType: "tool_use",
      action: "test",
      target: "test",
      metadata: { raw_snippet: "x".repeat(1000) },
    });

    expect((event.metadata.raw_snippet as string).length).toBeLessThanOrEqual(500);
  });

  it("redacts secrets in raw_snippet", () => {
    const event = buildEvent({
      agentId: "a",
      sessionId: "s",
      eventType: "tool_use",
      action: "test",
      target: "test",
      metadata: { raw_snippet: "key is sk-1234567890abcdefghijklmnop" },
    });

    expect(event.metadata.raw_snippet).toContain("[REDACTED]");
    expect(event.metadata.raw_snippet).not.toContain("sk-1234567890");
  });

  it("sets correct event types", () => {
    for (const eventType of ["tool_use", "llm_call", "message_sent", "agent_lifecycle", "subagent"] as const) {
      const event = buildEvent({
        agentId: "a",
        sessionId: "s",
        eventType,
        action: "test",
        target: "test",
      });
      expect(event.event_type).toBe(eventType);
    }
  });

  it("assigns elevated severity on error", () => {
    const event = buildEvent({
      agentId: "a",
      sessionId: "s",
      eventType: "tool_use",
      action: "test",
      target: "test",
      metadata: { error: "something failed" },
    });
    expect(event.severity_hint).toBe("elevated");
  });
});

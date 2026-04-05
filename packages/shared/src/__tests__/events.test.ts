import { describe, it, expect } from "vitest";
import { clawnitorEventSchema, createEventId } from "../events.js";

const validEvent = {
  agent_id: "agent-1",
  session_id: "session-1",
  timestamp: "2026-03-14T12:00:00.000Z",
  event_type: "tool_use" as const,
  action: "called send_email",
  target: "gmail_api",
  metadata: {
    tool_name: "send_email",
    duration_ms: 150,
    cost_usd: 0.002,
  },
  severity_hint: "normal" as const,
  event_id: "019e1234-5678-7000-8000-000000000001",
  plugin_version: "0.0.1",
};

describe("clawnitorEventSchema", () => {
  it("accepts a valid event", () => {
    const result = clawnitorEventSchema.safeParse(validEvent);
    expect(result.success).toBe(true);
  });

  it("accepts all event types", () => {
    const types = [
      "tool_use",
      "llm_call",
      "message_sent",
      "message_received",
      "agent_lifecycle",
      "subagent",
    ];
    for (const event_type of types) {
      const result = clawnitorEventSchema.safeParse({
        ...validEvent,
        event_type,
      });
      expect(result.success).toBe(true);
    }
  });

  it("accepts all severity hints", () => {
    for (const severity_hint of ["normal", "elevated", "critical"]) {
      const result = clawnitorEventSchema.safeParse({
        ...validEvent,
        severity_hint,
      });
      expect(result.success).toBe(true);
    }
  });

  it("accepts minimal metadata", () => {
    const result = clawnitorEventSchema.safeParse({
      ...validEvent,
      metadata: {},
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing agent_id", () => {
    const { agent_id, ...rest } = validEvent;
    const result = clawnitorEventSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects empty agent_id", () => {
    const result = clawnitorEventSchema.safeParse({
      ...validEvent,
      agent_id: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid event_type", () => {
    const result = clawnitorEventSchema.safeParse({
      ...validEvent,
      event_type: "invalid_type",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid severity_hint", () => {
    const result = clawnitorEventSchema.safeParse({
      ...validEvent,
      severity_hint: "unknown",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid timestamp format", () => {
    const result = clawnitorEventSchema.safeParse({
      ...validEvent,
      timestamp: "not-a-date",
    });
    expect(result.success).toBe(false);
  });

  it("rejects raw_snippet over 500 chars", () => {
    const result = clawnitorEventSchema.safeParse({
      ...validEvent,
      metadata: { raw_snippet: "x".repeat(501) },
    });
    expect(result.success).toBe(false);
  });

  it("accepts raw_snippet at exactly 500 chars", () => {
    const result = clawnitorEventSchema.safeParse({
      ...validEvent,
      metadata: { raw_snippet: "x".repeat(500) },
    });
    expect(result.success).toBe(true);
  });
});

describe("createEventId", () => {
  it("returns a valid UUID", () => {
    const id = createEventId();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
  });

  it("generates unique IDs", () => {
    const ids = new Set(Array.from({ length: 100 }, () => createEventId()));
    expect(ids.size).toBe(100);
  });
});

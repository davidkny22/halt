import { describe, it, expect } from "vitest";
import { evaluateRules, type RuleWithId } from "../rules/engine.js";
import { evaluateThreshold } from "../rules/evaluators/threshold.js";
import { evaluateRate } from "../rules/evaluators/rate.js";
import { evaluateKeyword } from "../rules/evaluators/keyword.js";
import type { HaltEvent } from "@halt/shared";

function makeEvent(overrides: Partial<HaltEvent> = {}): HaltEvent {
  return {
    agent_id: "agent-1",
    session_id: "session-1",
    timestamp: new Date().toISOString(),
    event_type: "tool_use",
    action: "test action",
    target: "test target",
    metadata: {},
    severity_hint: "normal",
    event_id: crypto.randomUUID(),
    plugin_version: "0.0.1",
    ...overrides,
  };
}

describe("evaluateThreshold", () => {
  it("triggers when sum exceeds threshold (gt)", () => {
    const events = [
      makeEvent({ metadata: { cost_usd: 15 } }),
      makeEvent({ metadata: { cost_usd: 12 } }),
    ];
    const result = evaluateThreshold(events, {
      field: "cost_usd",
      operator: "gt",
      value: 25,
      windowMinutes: 60,
    });
    expect(result.triggered).toBe(true);
    expect(result.context).toContain("27");
  });

  it("does not trigger when sum is below threshold", () => {
    const events = [
      makeEvent({ metadata: { cost_usd: 10 } }),
      makeEvent({ metadata: { cost_usd: 5 } }),
    ];
    const result = evaluateThreshold(events, {
      field: "cost_usd",
      operator: "gt",
      value: 25,
      windowMinutes: 60,
    });
    expect(result.triggered).toBe(false);
  });

  it("does not trigger at exact boundary (gt)", () => {
    const events = [makeEvent({ metadata: { cost_usd: 25 } })];
    const result = evaluateThreshold(events, {
      field: "cost_usd",
      operator: "gt",
      value: 25,
      windowMinutes: 60,
    });
    expect(result.triggered).toBe(false);
  });

  it("triggers for lt operator", () => {
    const events = [makeEvent({ metadata: { cost_usd: 5 } })];
    const result = evaluateThreshold(events, {
      field: "cost_usd",
      operator: "lt",
      value: 10,
      windowMinutes: 60,
    });
    expect(result.triggered).toBe(true);
  });

  it("handles empty events", () => {
    const result = evaluateThreshold([], {
      field: "cost_usd",
      operator: "gt",
      value: 0,
      windowMinutes: 60,
    });
    expect(result.triggered).toBe(false);
  });

  it("ignores events without the target field", () => {
    const events = [
      makeEvent({ metadata: { tokens_used: 100 } }),
      makeEvent({ metadata: { cost_usd: 5 } }),
    ];
    const result = evaluateThreshold(events, {
      field: "cost_usd",
      operator: "gt",
      value: 4,
      windowMinutes: 60,
    });
    expect(result.triggered).toBe(true);
  });
});

describe("evaluateRate", () => {
  it("triggers when count exceeds max", () => {
    const events = Array.from({ length: 25 }, () => makeEvent());
    const result = evaluateRate(events, {
      maxCount: 20,
      windowMinutes: 10,
    });
    expect(result.triggered).toBe(true);
    expect(result.context).toContain("25");
  });

  it("does not trigger at or below max", () => {
    const events = Array.from({ length: 20 }, () => makeEvent());
    const result = evaluateRate(events, {
      maxCount: 20,
      windowMinutes: 10,
    });
    expect(result.triggered).toBe(false);
  });

  it("filters by event type", () => {
    const events = [
      makeEvent({ event_type: "tool_use" }),
      makeEvent({ event_type: "tool_use" }),
      makeEvent({ event_type: "llm_call" }),
      makeEvent({ event_type: "llm_call" }),
      makeEvent({ event_type: "llm_call" }),
    ];
    const result = evaluateRate(events, {
      eventType: "tool_use",
      maxCount: 1,
      windowMinutes: 10,
    });
    expect(result.triggered).toBe(true);
  });

  it("filters by tool name", () => {
    const events = [
      makeEvent({ metadata: { tool_name: "send_email" } }),
      makeEvent({ metadata: { tool_name: "send_email" } }),
      makeEvent({ metadata: { tool_name: "read_file" } }),
    ];
    const result = evaluateRate(events, {
      toolName: "send_email",
      maxCount: 1,
      windowMinutes: 10,
    });
    expect(result.triggered).toBe(true);
  });

  it("handles empty events", () => {
    const result = evaluateRate([], {
      maxCount: 1,
      windowMinutes: 10,
    });
    expect(result.triggered).toBe(false);
  });
});

describe("evaluateKeyword", () => {
  it("triggers on any keyword match", () => {
    const events = [
      makeEvent({ action: "deploying to production" }),
    ];
    const result = evaluateKeyword(events, {
      keywords: ["production", "staging"],
      matchMode: "any",
      caseSensitive: false,
    });
    expect(result.triggered).toBe(true);
    expect(result.context).toContain("production");
  });

  it("does not trigger when no keywords match", () => {
    const events = [makeEvent({ action: "reading file" })];
    const result = evaluateKeyword(events, {
      keywords: ["production", "deploy"],
      matchMode: "any",
      caseSensitive: false,
    });
    expect(result.triggered).toBe(false);
  });

  it("requires all keywords for 'all' mode", () => {
    const events = [
      makeEvent({ action: "deploying to production" }),
    ];
    const result = evaluateKeyword(events, {
      keywords: ["production", "database"],
      matchMode: "all",
      caseSensitive: false,
    });
    expect(result.triggered).toBe(false);
  });

  it("triggers when all keywords match across events", () => {
    const events = [
      makeEvent({ action: "deploying to production" }),
      makeEvent({ action: "modifying database" }),
    ];
    const result = evaluateKeyword(events, {
      keywords: ["production", "database"],
      matchMode: "all",
      caseSensitive: false,
    });
    expect(result.triggered).toBe(true);
  });

  it("respects case sensitivity", () => {
    const events = [makeEvent({ action: "Production deploy" })];
    const result = evaluateKeyword(events, {
      keywords: ["production"],
      matchMode: "any",
      caseSensitive: true,
    });
    expect(result.triggered).toBe(false);
  });

  it("case insensitive by default", () => {
    const events = [makeEvent({ action: "PRODUCTION deploy" })];
    const result = evaluateKeyword(events, {
      keywords: ["production"],
      matchMode: "any",
      caseSensitive: false,
    });
    expect(result.triggered).toBe(true);
  });

  it("searches in target field", () => {
    const events = [makeEvent({ target: "production-api" })];
    const result = evaluateKeyword(events, {
      keywords: ["production"],
      matchMode: "any",
      caseSensitive: false,
    });
    expect(result.triggered).toBe(true);
  });

  it("searches in raw_snippet", () => {
    const events = [
      makeEvent({ metadata: { raw_snippet: "rm -rf /production" } }),
    ];
    const result = evaluateKeyword(events, {
      keywords: ["production"],
      matchMode: "any",
      caseSensitive: false,
    });
    expect(result.triggered).toBe(true);
  });

  it("handles empty events", () => {
    const result = evaluateKeyword([], {
      keywords: ["anything"],
      matchMode: "any",
      caseSensitive: false,
    });
    expect(result.triggered).toBe(false);
  });
});

describe("evaluateRules (engine)", () => {
  it("evaluates multiple rules and returns results", () => {
    const events = [
      makeEvent({ metadata: { cost_usd: 30 } }),
      makeEvent({ action: "deploying to production" }),
    ];

    const rules: RuleWithId[] = [
      {
        id: "rule-1",
        name: "High spend",
        config: { type: "threshold", field: "cost_usd", operator: "gt", value: 25, windowMinutes: 60 },
      },
      {
        id: "rule-2",
        name: "Production keyword",
        config: { type: "keyword", keywords: ["production"], matchMode: "any", caseSensitive: false },
      },
      {
        id: "rule-3",
        name: "Rate limit",
        config: { type: "rate", maxCount: 100, windowMinutes: 10 },
      },
    ];

    const results = evaluateRules(events, rules);
    expect(results).toHaveLength(3);
    expect(results[0].triggered).toBe(true); // threshold
    expect(results[1].triggered).toBe(true); // keyword
    expect(results[2].triggered).toBe(false); // rate (only 2 events)
  });

  it("handles empty rules", () => {
    const events = [makeEvent()];
    const results = evaluateRules(events, []);
    expect(results).toHaveLength(0);
  });

  it("handles empty events", () => {
    const rules: RuleWithId[] = [
      {
        id: "rule-1",
        name: "Test",
        config: { type: "rate", maxCount: 0, windowMinutes: 10 },
      },
    ];
    const results = evaluateRules([], rules);
    expect(results).toHaveLength(1);
    expect(results[0].triggered).toBe(false);
  });
});

import { describe, it, expect } from "vitest";
import { ruleConfigSchema } from "../rules.js";

describe("ruleConfigSchema", () => {
  it("accepts a valid threshold rule", () => {
    const result = ruleConfigSchema.safeParse({
      type: "threshold",
      field: "cost_usd",
      operator: "gt",
      value: 25,
      windowMinutes: 60,
    });
    expect(result.success).toBe(true);
  });

  it("accepts a valid rate rule", () => {
    const result = ruleConfigSchema.safeParse({
      type: "rate",
      maxCount: 20,
      windowMinutes: 10,
      eventType: "message_sent",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a rate rule without optional filters", () => {
    const result = ruleConfigSchema.safeParse({
      type: "rate",
      maxCount: 100,
      windowMinutes: 5,
    });
    expect(result.success).toBe(true);
  });

  it("accepts a valid keyword rule", () => {
    const result = ruleConfigSchema.safeParse({
      type: "keyword",
      keywords: ["production", "deploy"],
      matchMode: "any",
      caseSensitive: false,
    });
    expect(result.success).toBe(true);
  });

  it("rejects unknown rule type", () => {
    const result = ruleConfigSchema.safeParse({
      type: "unknown",
      field: "cost_usd",
    });
    expect(result.success).toBe(false);
  });

  it("rejects threshold with negative windowMinutes", () => {
    const result = ruleConfigSchema.safeParse({
      type: "threshold",
      field: "cost_usd",
      operator: "gt",
      value: 25,
      windowMinutes: -1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects keyword rule with empty keywords array", () => {
    const result = ruleConfigSchema.safeParse({
      type: "keyword",
      keywords: [],
      matchMode: "any",
    });
    expect(result.success).toBe(false);
  });

  it("rejects rate rule with zero maxCount", () => {
    const result = ruleConfigSchema.safeParse({
      type: "rate",
      maxCount: 0,
      windowMinutes: 5,
    });
    expect(result.success).toBe(false);
  });
});

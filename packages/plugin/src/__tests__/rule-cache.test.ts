import { describe, it, expect } from "vitest";
import { RuleCache } from "../rule-cache.js";
import type { PluginConfig } from "../config.js";

function makeConfig(): PluginConfig {
  return {
    apiKey: "clw_live_test",
    backendUrl: "http://localhost:3001",
    spendLimit: 100,
    rateLimit: 120,
    toolBlocklist: [],
    redactionPatterns: [],
  };
}

describe("RuleCache", () => {
  describe("keyword rules", () => {
    it("blocks when keyword matches tool name", () => {
      const cache = new RuleCache(makeConfig());
      // Manually inject a rule (simulating fetched rules)
      (cache as any).rules = [
        {
          id: "r1",
          name: "Block rm",
          rule_type: "keyword",
          config: { keywords: ["rm -rf"], matchMode: "any", caseSensitive: false },
          enabled: true,
        },
      ];

      const result = cache.checkBeforeToolCall("bash", { command: "rm -rf /data" });
      expect(result.blocked).toBe(true);
      expect(result.reason).toContain("rm -rf");
    });

    it("does not block when keyword doesn't match", () => {
      const cache = new RuleCache(makeConfig());
      (cache as any).rules = [
        {
          id: "r1",
          name: "Block rm",
          rule_type: "keyword",
          config: { keywords: ["rm -rf"], matchMode: "any", caseSensitive: false },
          enabled: true,
        },
      ];

      const result = cache.checkBeforeToolCall("read_file", { path: "/data/report.md" });
      expect(result.blocked).toBe(false);
    });

    it("respects case sensitivity", () => {
      const cache = new RuleCache(makeConfig());
      (cache as any).rules = [
        {
          id: "r1",
          name: "Block production",
          rule_type: "keyword",
          config: { keywords: ["PRODUCTION"], matchMode: "any", caseSensitive: true },
          enabled: true,
        },
      ];

      const result = cache.checkBeforeToolCall("deploy", { env: "production" });
      expect(result.blocked).toBe(false); // "production" !== "PRODUCTION"
    });
  });

  describe("rate rules", () => {
    it("blocks when rate exceeds max", () => {
      const cache = new RuleCache(makeConfig());
      (cache as any).rules = [
        {
          id: "r1",
          name: "Rate limit",
          rule_type: "rate",
          config: { maxCount: 3, windowMinutes: 10 },
          enabled: true,
        },
      ];

      // Record 3 events
      for (let i = 0; i < 3; i++) {
        cache.recordEvent({ timestamp: Date.now(), toolName: "send_email", eventType: "tool_use" });
      }

      const result = cache.checkBeforeToolCall("send_email");
      expect(result.blocked).toBe(true);
      expect(result.reason).toContain("3 events");
    });

    it("does not block below max", () => {
      const cache = new RuleCache(makeConfig());
      (cache as any).rules = [
        {
          id: "r1",
          name: "Rate limit",
          rule_type: "rate",
          config: { maxCount: 10, windowMinutes: 10 },
          enabled: true,
        },
      ];

      cache.recordEvent({ timestamp: Date.now(), toolName: "send_email", eventType: "tool_use" });

      const result = cache.checkBeforeToolCall("send_email");
      expect(result.blocked).toBe(false);
    });

    it("filters by tool name", () => {
      const cache = new RuleCache(makeConfig());
      (cache as any).rules = [
        {
          id: "r1",
          name: "Email rate",
          rule_type: "rate",
          config: { maxCount: 2, windowMinutes: 10, toolName: "send_email" },
          enabled: true,
        },
      ];

      // Record events for different tools
      cache.recordEvent({ timestamp: Date.now(), toolName: "send_email", eventType: "tool_use" });
      cache.recordEvent({ timestamp: Date.now(), toolName: "send_email", eventType: "tool_use" });
      cache.recordEvent({ timestamp: Date.now(), toolName: "read_file", eventType: "tool_use" });

      const result = cache.checkBeforeToolCall("send_email");
      expect(result.blocked).toBe(true);
    });
  });

  describe("threshold rules", () => {
    it("blocks when spend exceeds threshold", () => {
      const cache = new RuleCache(makeConfig());
      (cache as any).rules = [
        {
          id: "r1",
          name: "Spend limit",
          rule_type: "threshold",
          config: { field: "cost_usd", operator: "gt", value: 1, windowMinutes: 60 },
          enabled: true,
        },
      ];

      cache.recordEvent({ timestamp: Date.now(), costUsd: 0.6 });
      cache.recordEvent({ timestamp: Date.now(), costUsd: 0.5 });

      const result = cache.checkBeforeToolCall("any_tool");
      expect(result.blocked).toBe(true);
    });

    it("does not block below threshold", () => {
      const cache = new RuleCache(makeConfig());
      (cache as any).rules = [
        {
          id: "r1",
          name: "Spend limit",
          rule_type: "threshold",
          config: { field: "cost_usd", operator: "gt", value: 10, windowMinutes: 60 },
          enabled: true,
        },
      ];

      cache.recordEvent({ timestamp: Date.now(), costUsd: 0.5 });

      const result = cache.checkBeforeToolCall("any_tool");
      expect(result.blocked).toBe(false);
    });
  });

  describe("NL rules", () => {
    it("skips NL rules (cannot evaluate locally)", () => {
      const cache = new RuleCache(makeConfig());
      (cache as any).rules = [
        {
          id: "r1",
          name: "Confusion detector",
          rule_type: "nl",
          config: { promptText: "alert if agent seems confused" },
          enabled: true,
        },
      ];

      const result = cache.checkBeforeToolCall("any_tool");
      expect(result.blocked).toBe(false);
    });
  });

  describe("multiple rules", () => {
    it("checks all rules and blocks on first match", () => {
      const cache = new RuleCache(makeConfig());
      (cache as any).rules = [
        {
          id: "r1",
          name: "Safe rule",
          rule_type: "keyword",
          config: { keywords: ["harmless"], matchMode: "any", caseSensitive: false },
          enabled: true,
        },
        {
          id: "r2",
          name: "Dangerous rule",
          rule_type: "keyword",
          config: { keywords: ["production"], matchMode: "any", caseSensitive: false },
          enabled: true,
        },
      ];

      const result = cache.checkBeforeToolCall("deploy", { env: "production" });
      expect(result.blocked).toBe(true);
      expect(result.ruleName).toBe("Dangerous rule");
    });
  });
});

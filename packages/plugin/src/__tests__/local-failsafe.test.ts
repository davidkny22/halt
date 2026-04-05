import { describe, it, expect, beforeEach } from "vitest";
import { LocalFailsafe } from "../kill-switch/local-failsafe.js";
import type { PluginConfig } from "../config.js";

function makeConfig(overrides: Partial<PluginConfig> = {}): PluginConfig {
  return {
    apiKey: "clw_live_test",
    backendUrl: "http://localhost:3001",
    spendLimit: 100,
    rateLimit: 120,
    toolBlocklist: [],
    redactionPatterns: [],
    ...overrides,
  };
}

describe("LocalFailsafe", () => {
  describe("spend circuit breaker", () => {
    it("does not block below spend limit", () => {
      const failsafe = new LocalFailsafe(makeConfig({ spendLimit: 100 }));
      failsafe.addSpend(50);
      expect(failsafe.check("any_tool").block).toBe(false);
    });

    it("blocks at exactly the spend limit", () => {
      const failsafe = new LocalFailsafe(makeConfig({ spendLimit: 100 }));
      failsafe.addSpend(100);
      expect(failsafe.check("any_tool").block).toBe(true);
      expect(failsafe.check("any_tool").reason).toContain("Spend limit");
    });

    it("blocks above spend limit", () => {
      const failsafe = new LocalFailsafe(makeConfig({ spendLimit: 50 }));
      failsafe.addSpend(30);
      failsafe.addSpend(25);
      expect(failsafe.check("any_tool").block).toBe(true);
    });

    it("resets on new session", () => {
      const failsafe = new LocalFailsafe(makeConfig({ spendLimit: 100 }));
      failsafe.addSpend(100);
      expect(failsafe.check("any_tool").block).toBe(true);
      failsafe.resetSession();
      expect(failsafe.check("any_tool").block).toBe(false);
    });

    it("tracks cumulative spend", () => {
      const failsafe = new LocalFailsafe(makeConfig({ spendLimit: 10 }));
      for (let i = 0; i < 10; i++) {
        failsafe.addSpend(1);
      }
      expect(failsafe.getSessionSpend()).toBe(10);
      expect(failsafe.check("any_tool").block).toBe(true);
    });
  });

  describe("rate limiter", () => {
    it("does not block below rate limit", () => {
      const failsafe = new LocalFailsafe(makeConfig({ rateLimit: 120 }));
      for (let i = 0; i < 50; i++) {
        failsafe.recordToolCall();
      }
      expect(failsafe.check("any_tool").block).toBe(false);
    });

    it("blocks at rate limit", () => {
      const failsafe = new LocalFailsafe(makeConfig({ rateLimit: 10 }));
      for (let i = 0; i < 10; i++) {
        failsafe.recordToolCall();
      }
      expect(failsafe.check("any_tool").block).toBe(true);
      expect(failsafe.check("any_tool").reason).toContain("Rate limit");
    });
  });

  describe("tool blocklist", () => {
    it("blocks listed tools", () => {
      const failsafe = new LocalFailsafe(
        makeConfig({ toolBlocklist: ["dangerous_tool"] })
      );
      expect(failsafe.check("dangerous_tool").block).toBe(true);
      expect(failsafe.check("dangerous_tool").reason).toContain("blocklisted");
    });

    it("blocks case-insensitively", () => {
      const failsafe = new LocalFailsafe(
        makeConfig({ toolBlocklist: ["DANGEROUS_TOOL"] })
      );
      expect(failsafe.check("dangerous_tool").block).toBe(true);
    });

    it("allows non-listed tools", () => {
      const failsafe = new LocalFailsafe(
        makeConfig({ toolBlocklist: ["dangerous_tool"] })
      );
      expect(failsafe.check("safe_tool").block).toBe(false);
    });

    it("handles empty blocklist", () => {
      const failsafe = new LocalFailsafe(makeConfig({ toolBlocklist: [] }));
      expect(failsafe.check("any_tool").block).toBe(false);
    });
  });

  describe("priority order", () => {
    it("spend check fires before rate check", () => {
      const failsafe = new LocalFailsafe(
        makeConfig({ spendLimit: 1, rateLimit: 1 })
      );
      failsafe.addSpend(5);
      failsafe.recordToolCall();
      failsafe.recordToolCall();
      const result = failsafe.check("any_tool");
      expect(result.block).toBe(true);
      expect(result.reason).toContain("Spend");
    });

    it("spend check fires before blocklist", () => {
      const failsafe = new LocalFailsafe(
        makeConfig({ spendLimit: 1, toolBlocklist: ["blocked"] })
      );
      failsafe.addSpend(5);
      const result = failsafe.check("blocked");
      expect(result.block).toBe(true);
      expect(result.reason).toContain("Spend");
    });
  });
});

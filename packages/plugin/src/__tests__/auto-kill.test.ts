import { describe, it, expect, beforeEach, vi } from "vitest";
import { ViolationTracker } from "../auto-kill.js";

describe("ViolationTracker", () => {
  let tracker: ViolationTracker;

  const makeViolation = (overrides?: Partial<{ ruleId: string; timestamp: number }>) => ({
    ruleId: overrides?.ruleId || "r1",
    ruleName: "Test Rule",
    timestamp: overrides?.timestamp || Date.now(),
    action: "file.delete",
    target: "/app/data",
  });

  beforeEach(() => {
    tracker = new ViolationTracker({ threshold: 3, windowMinutes: 10 });
  });

  it("should not trigger auto-kill below threshold", () => {
    const r1 = tracker.recordViolation(makeViolation());
    expect(r1.shouldKill).toBe(false);
    const r2 = tracker.recordViolation(makeViolation());
    expect(r2.shouldKill).toBe(false);
  });

  it("should trigger auto-kill at threshold", () => {
    tracker.recordViolation(makeViolation());
    tracker.recordViolation(makeViolation());
    const result = tracker.recordViolation(makeViolation());
    expect(result.shouldKill).toBe(true);
    expect(result.violations).toHaveLength(3);
    expect(result.message).toContain("3 violations");
  });

  it("should not trigger if violations are outside window", () => {
    const oldTimestamp = Date.now() - 11 * 60_000; // 11 minutes ago
    tracker.recordViolation(makeViolation({ timestamp: oldTimestamp }));
    tracker.recordViolation(makeViolation({ timestamp: oldTimestamp }));
    const result = tracker.recordViolation(makeViolation());
    expect(result.shouldKill).toBe(false);
  });

  it("should count violations from different rules toward global threshold", () => {
    tracker.recordViolation(makeViolation({ ruleId: "r1" }));
    tracker.recordViolation(makeViolation({ ruleId: "r2" }));
    const result = tracker.recordViolation(makeViolation({ ruleId: "r3" }));
    expect(result.shouldKill).toBe(true);
  });

  it("should not trigger when disabled", () => {
    tracker.updateConfig({ enabled: false });
    tracker.recordViolation(makeViolation());
    tracker.recordViolation(makeViolation());
    const result = tracker.recordViolation(makeViolation());
    expect(result.shouldKill).toBe(false);
  });

  it("should respect updated threshold", () => {
    tracker.updateConfig({ threshold: 5 });
    for (let i = 0; i < 4; i++) {
      expect(tracker.recordViolation(makeViolation()).shouldKill).toBe(false);
    }
    expect(tracker.recordViolation(makeViolation()).shouldKill).toBe(true);
  });

  it("should reset violations", () => {
    tracker.recordViolation(makeViolation());
    tracker.recordViolation(makeViolation());
    tracker.reset();
    const result = tracker.recordViolation(makeViolation());
    expect(result.shouldKill).toBe(false);
  });

  it("should return correct violation count", () => {
    tracker.recordViolation(makeViolation());
    tracker.recordViolation(makeViolation());
    expect(tracker.getViolationCount()).toBe(2);
  });

  it("should prune old violations from count", () => {
    const old = Date.now() - 25 * 60_000;
    tracker.recordViolation(makeViolation({ timestamp: old }));
    tracker.recordViolation(makeViolation());
    expect(tracker.getViolationCount()).toBe(1);
  });
});

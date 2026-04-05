import { describe, it, expect } from "vitest";
import { IdempotencyChecker } from "../util/idempotency.js";

describe("IdempotencyChecker", () => {
  it("returns false for first occurrence", () => {
    const checker = new IdempotencyChecker();
    expect(checker.isDuplicate("event-1")).toBe(false);
  });

  it("returns true for duplicate", () => {
    const checker = new IdempotencyChecker();
    checker.isDuplicate("event-1");
    expect(checker.isDuplicate("event-1")).toBe(true);
  });

  it("handles multiple distinct IDs", () => {
    const checker = new IdempotencyChecker();
    expect(checker.isDuplicate("a")).toBe(false);
    expect(checker.isDuplicate("b")).toBe(false);
    expect(checker.isDuplicate("a")).toBe(true);
    expect(checker.isDuplicate("c")).toBe(false);
  });

  it("evicts oldest when exceeding max size", () => {
    const checker = new IdempotencyChecker();
    // Fill with 10001 entries to trigger eviction
    for (let i = 0; i < 10_001; i++) {
      checker.isDuplicate(`event-${i}`);
    }
    // First entry should have been evicted
    expect(checker.isDuplicate("event-0")).toBe(false);
    // Recent entry should still be there
    expect(checker.isDuplicate("event-10000")).toBe(true);
  });

  it("clears all entries", () => {
    const checker = new IdempotencyChecker();
    checker.isDuplicate("event-1");
    checker.clear();
    expect(checker.isDuplicate("event-1")).toBe(false);
  });
});

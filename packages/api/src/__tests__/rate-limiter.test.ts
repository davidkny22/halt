import { describe, it, expect } from "vitest";
import { RateLimiter } from "../util/rate-limiter.js";

describe("RateLimiter", () => {
  it("allows requests within limit", () => {
    const limiter = new RateLimiter(100, 100);
    for (let i = 0; i < 100; i++) {
      expect(limiter.consume("user-1")).toBe(true);
    }
  });

  it("blocks requests over limit", () => {
    const limiter = new RateLimiter(10, 10);
    for (let i = 0; i < 10; i++) {
      limiter.consume("user-1");
    }
    expect(limiter.consume("user-1")).toBe(false);
  });

  it("isolates keys", () => {
    const limiter = new RateLimiter(1, 1);
    expect(limiter.consume("user-1")).toBe(true);
    expect(limiter.consume("user-1")).toBe(false);
    expect(limiter.consume("user-2")).toBe(true);
  });

  it("resets a key", () => {
    const limiter = new RateLimiter(1, 1);
    limiter.consume("user-1");
    expect(limiter.consume("user-1")).toBe(false);
    limiter.reset("user-1");
    expect(limiter.consume("user-1")).toBe(true);
  });
});

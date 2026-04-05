import { describe, it, expect, beforeEach } from "vitest";
import { killState } from "../kill-switch/kill-state.js";

describe("killState", () => {
  beforeEach(() => {
    killState.clearKilled();
  });

  it("starts as not killed", () => {
    expect(killState.isKilled()).toBe(false);
    expect(killState.getReason()).toBeUndefined();
  });

  it("can be set to killed", () => {
    killState.setKilled("Too many emails");
    expect(killState.isKilled()).toBe(true);
    expect(killState.getReason()).toBe("Too many emails");
  });

  it("can be cleared", () => {
    killState.setKilled("test");
    killState.clearKilled();
    expect(killState.isKilled()).toBe(false);
    expect(killState.getReason()).toBeUndefined();
  });

  it("getState returns a snapshot", () => {
    killState.setKilled("snapshot test");
    const state = killState.getState();
    expect(state.killed).toBe(true);
    expect(state.reason).toBe("snapshot test");
    expect(state.killedAt).toBeInstanceOf(Date);
  });
});

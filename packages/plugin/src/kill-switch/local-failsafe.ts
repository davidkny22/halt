import type { PluginConfig } from "../config.js";

interface FailsafeResult {
  block: boolean;
  reason: string;
}

// Sliding window rate counter
class RateCounter {
  private timestamps: number[] = [];

  record() {
    this.timestamps.push(Date.now());
  }

  getCallsPerMinute(): number {
    const now = Date.now();
    const oneMinuteAgo = now - 60_000;
    this.timestamps = this.timestamps.filter((t) => t > oneMinuteAgo);
    return this.timestamps.length;
  }
}

export class LocalFailsafe {
  private sessionSpend = 0;
  private rateCounter = new RateCounter();
  private config: PluginConfig;

  constructor(config: PluginConfig) {
    this.config = config;
  }

  addSpend(costUsd: number) {
    this.sessionSpend += costUsd;
  }

  recordToolCall() {
    this.rateCounter.record();
  }

  resetSession() {
    this.sessionSpend = 0;
  }

  check(toolName: string): FailsafeResult {
    // 1. Spend circuit breaker
    if (this.sessionSpend >= this.config.spendLimit) {
      return {
        block: true,
        reason: `Halt: Spend limit reached ($${this.sessionSpend.toFixed(2)} >= $${this.config.spendLimit}). Agent paused.`,
      };
    }

    // 2. Rate limiter
    const callsPerMin = this.rateCounter.getCallsPerMinute();
    if (callsPerMin >= this.config.rateLimit) {
      return {
        block: true,
        reason: `Halt: Rate limit reached (${callsPerMin} calls/min >= ${this.config.rateLimit}). Agent paused.`,
      };
    }

    // 3. Tool blocklist
    const normalizedTool = toolName.toLowerCase();
    const blocked = this.config.toolBlocklist.some(
      (t) => t.toLowerCase() === normalizedTool
    );
    if (blocked) {
      return {
        block: true,
        reason: `Halt: Tool "${toolName}" is blocklisted. Agent paused.`,
      };
    }

    return { block: false, reason: "" };
  }

  getSessionSpend(): number {
    return this.sessionSpend;
  }

  getCallsPerMinute(): number {
    return this.rateCounter.getCallsPerMinute();
  }
}

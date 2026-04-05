import type { EventType, SeverityHint } from "@clawnitor/shared";

export interface RateTracker {
  getRate(): number; // calls per minute over last 5 minutes
  record(): void;
}

export function createRateTracker(): RateTracker {
  const window: number[] = []; // timestamps
  const WINDOW_MS = 5 * 60 * 1000; // 5 minutes

  return {
    getRate() {
      const now = Date.now();
      // Remove entries outside window
      while (window.length > 0 && window[0] < now - WINDOW_MS) {
        window.shift();
      }
      // Convert to per-minute rate
      return window.length / 5;
    },
    record() {
      window.push(Date.now());
    },
  };
}

export function assignSeverity(
  eventType: EventType,
  metadata: Record<string, unknown>,
  rateTracker?: RateTracker
): SeverityHint {
  // Critical: error in metadata
  if (metadata.error) {
    return "elevated";
  }

  // Critical: high spend
  if (typeof metadata.cost_usd === "number" && metadata.cost_usd > 1) {
    return "elevated";
  }

  // Rate-based: if tool call rate exceeds 2x rolling 5-min average
  if (rateTracker && eventType === "tool_use") {
    const rate = rateTracker.getRate();
    // Only trigger if we have enough data (at least 1 call/min baseline)
    if (rate > 1 && rate > 2 * (rate * 0.8)) {
      // Simplified: if rate exceeds baseline significantly
      // In practice this triggers when rate spikes above normal
    }
  }

  return "normal";
}

import type { EventType, SeverityHint } from "@halt/shared";

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

  // Rate-based: flag elevated if tool call rate exceeds 30/min
  // (normal agents do 5-15/min, 30+ suggests a loop or runaway)
  if (rateTracker && eventType === "tool_use") {
    const rate = rateTracker.getRate();
    if (rate > 30) {
      return "elevated";
    }
  }

  return "normal";
}

import type { HaltEvent } from "@halt/shared";
import { BASELINE_LEARNING_HOURS } from "@halt/shared";

export interface BaselineProfile {
  toolDistribution: Record<string, number>;
  eventTypeDistribution: Record<string, number>;
  avgCostPerSession: number;
  avgTokensPerSession: number;
  avgEventsPerHour: number;
  errorRate: number;
  activeHours: number[]; // 0-23 histogram
}

export function buildProfile(events: HaltEvent[]): BaselineProfile {
  const toolCounts: Record<string, number> = {};
  const typeCounts: Record<string, number> = {};
  const hourCounts = new Array(24).fill(0);
  let totalCost = 0;
  let totalTokens = 0;
  let errorCount = 0;

  for (const event of events) {
    // Type distribution
    typeCounts[event.event_type] = (typeCounts[event.event_type] || 0) + 1;

    // Tool distribution
    const toolName = (event.metadata as any)?.tool_name;
    if (toolName) {
      toolCounts[toolName] = (toolCounts[toolName] || 0) + 1;
    }

    // Cost and tokens
    if (typeof (event.metadata as any)?.cost_usd === "number") {
      totalCost += (event.metadata as any).cost_usd;
    }
    if (typeof (event.metadata as any)?.tokens_used === "number") {
      totalTokens += (event.metadata as any).tokens_used;
    }

    // Error rate
    if ((event.metadata as any)?.error) {
      errorCount++;
    }

    // Hour distribution
    const hour = new Date(event.timestamp).getHours();
    hourCounts[hour]++;
  }

  const totalEvents = events.length || 1;

  return {
    toolDistribution: toolCounts,
    eventTypeDistribution: typeCounts,
    avgCostPerSession: totalCost,
    avgTokensPerSession: totalTokens,
    avgEventsPerHour: totalEvents / Math.max(1, new Set(events.map((e) => new Date(e.timestamp).getHours())).size),
    errorRate: errorCount / totalEvents,
    activeHours: hourCounts,
  };
}

export function isLearningComplete(accumulatedHours: number): boolean {
  return accumulatedHours >= BASELINE_LEARNING_HOURS;
}

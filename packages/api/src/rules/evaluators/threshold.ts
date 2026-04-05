import type { ThresholdConfig } from "@clawnitor/shared";
import type { ClawnitorEvent } from "@clawnitor/shared";

export interface EvalResult {
  triggered: boolean;
  context?: string;
}

export function evaluateThreshold(
  events: ClawnitorEvent[],
  config: ThresholdConfig
): EvalResult {
  // Extract the numeric field from metadata
  let sum = 0;
  for (const event of events) {
    const value = (event.metadata as Record<string, unknown>)[config.field];
    if (typeof value === "number") {
      sum += value;
    }
  }

  const triggered =
    config.operator === "gt" ? sum > config.value : sum < config.value;

  return {
    triggered,
    context: triggered
      ? `${config.field} = ${sum.toFixed(4)} (${config.operator} ${config.value} over ${config.windowMinutes}min)`
      : undefined,
  };
}

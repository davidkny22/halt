import type { RateConfig } from "@clawnitor/shared";
import type { ClawnitorEvent } from "@clawnitor/shared";

export interface EvalResult {
  triggered: boolean;
  context?: string;
}

export function evaluateRate(
  events: ClawnitorEvent[],
  config: RateConfig
): EvalResult {
  let filtered = events;

  if (config.eventType) {
    filtered = filtered.filter((e) => e.event_type === config.eventType);
  }

  if (config.toolName) {
    filtered = filtered.filter(
      (e) =>
        (e.metadata as Record<string, unknown>).tool_name === config.toolName
    );
  }

  const count = filtered.length;
  const triggered = count > config.maxCount;

  return {
    triggered,
    context: triggered
      ? `${count} events in ${config.windowMinutes}min (max: ${config.maxCount})`
      : undefined,
  };
}

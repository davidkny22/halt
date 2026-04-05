import type { RateConfig } from "@halt/shared";
import type { HaltEvent } from "@halt/shared";

export interface EvalResult {
  triggered: boolean;
  context?: string;
}

export function evaluateRate(
  events: HaltEvent[],
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

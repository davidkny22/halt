import type { HaltEvent, RuleConfig } from "@halt/shared";
import { evaluateThreshold } from "./evaluators/threshold.js";
import { evaluateRate } from "./evaluators/rate.js";
import { evaluateKeyword } from "./evaluators/keyword.js";

export interface RuleWithId {
  id: string;
  name: string;
  config: RuleConfig;
  action_mode?: string; // "block" | "alert" | "both"
}

export interface RuleEvalResult {
  rule: RuleWithId;
  triggered: boolean;
  context?: string;
}

export function evaluateRules(
  events: HaltEvent[],
  rules: RuleWithId[]
): RuleEvalResult[] {
  const results: RuleEvalResult[] = [];

  for (const rule of rules) {
    const config = rule.config;
    let result;

    switch (config.type) {
      case "threshold":
        result = evaluateThreshold(events, config);
        break;
      case "rate":
        result = evaluateRate(events, config);
        break;
      case "keyword":
        result = evaluateKeyword(events, config);
        break;
      default:
        result = { triggered: false };
    }

    results.push({
      rule,
      triggered: result.triggered,
      context: result.context,
    });
  }

  return results;
}

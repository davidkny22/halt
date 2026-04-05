import { NextRequest, NextResponse } from "next/server";
import type {
  DemoEvent,
  DemoRule,
  EvalResult,
  ThresholdConfig,
  RateConfig,
  KeywordConfig,
} from "@/app/demo/demo-types";

// Inlined evaluators from packages/api/src/rules/evaluators/
// These are pure functions with no external dependencies

function evaluateThreshold(
  events: DemoEvent[],
  config: ThresholdConfig
): { triggered: boolean; context?: string } {
  let sum = 0;
  for (const event of events) {
    const value = (event.metadata as Record<string, unknown>)[config.field];
    if (typeof value === "number") {
      sum += value;
    }
  }

  const triggered = config.operator === "gt" ? sum > config.value : sum < config.value;

  return {
    triggered,
    context: triggered
      ? `${config.field} = ${sum.toFixed(2)} (${config.operator === "gt" ? ">" : "<"} ${config.value})`
      : undefined,
  };
}

function evaluateRate(
  events: DemoEvent[],
  config: RateConfig
): { triggered: boolean; context?: string } {
  let filtered = [...events];

  if (config.eventType) {
    filtered = filtered.filter((e) => e.event_type === config.eventType);
  }

  if (config.toolName) {
    filtered = filtered.filter((e) => e.action === config.toolName);
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

function evaluateKeyword(
  events: DemoEvent[],
  config: KeywordConfig
): { triggered: boolean; context?: string; matchedEventIds: string[] } {
  const matchedKeywords = new Set<string>();
  const matchedEventIds: string[] = [];

  for (const event of events) {
    const searchable = [
      event.action,
      event.target,
      JSON.stringify(event.metadata),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    let eventMatched = false;
    for (const keyword of config.keywords) {
      const kw = config.caseSensitive ? keyword : keyword.toLowerCase();
      const text = config.caseSensitive ? searchable : searchable;
      if (text.includes(kw)) {
        matchedKeywords.add(keyword);
        eventMatched = true;
      }
    }
    if (eventMatched) matchedEventIds.push(event.id);
  }

  const triggered =
    config.matchMode === "any"
      ? matchedKeywords.size > 0
      : matchedKeywords.size === config.keywords.length;

  return {
    triggered,
    context: triggered
      ? `Matched: ${[...matchedKeywords].join(", ")}`
      : undefined,
    matchedEventIds,
  };
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { events, rules, allEvents } = body as {
    events: DemoEvent[];
    rules: DemoRule[];
    allEvents: DemoEvent[];
  };

  const activeRules = rules.filter((r) => r.enabled);
  const results: EvalResult[] = [];

  for (const event of events) {
    const triggered_rules: EvalResult["triggered_rules"] = [];

    for (const rule of activeRules) {
      const config = rule.config;
      let triggered = false;

      switch (config.type) {
        case "threshold": {
          const result = evaluateThreshold(allEvents, config);
          triggered = result.triggered;
          break;
        }
        case "rate": {
          const result = evaluateRate(allEvents, config);
          triggered = result.triggered;
          break;
        }
        case "keyword": {
          const result = evaluateKeyword([event], config);
          triggered = result.triggered;
          break;
        }
      }

      if (triggered) {
        triggered_rules.push({
          rule_id: rule.id,
          rule_name: rule.name,
          type: config.type,
        });
      }
    }

    results.push({
      event_id: event.id,
      triggered_rules,
      blocked: triggered_rules.length > 0,
    });
  }

  return NextResponse.json({ results });
}

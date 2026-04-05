export interface DemoEvent {
  id: string;
  event_type: "tool_use" | "llm_call" | "message_sent" | "agent_lifecycle";
  action: string;
  target: string;
  agent_name: string;
  timestamp: string;
  metadata: Record<string, unknown>;
  // Client-side enrichment after evaluation
  blocked?: boolean;
  triggered_rules?: { rule_id: string; rule_name: string; type: string }[];
}

export type ThresholdConfig = {
  type: "threshold";
  field: string;
  operator: "gt" | "lt";
  value: number;
  windowMinutes: number;
};

export type RateConfig = {
  type: "rate";
  eventType?: string;
  toolName?: string;
  maxCount: number;
  windowMinutes: number;
};

export type KeywordConfig = {
  type: "keyword";
  keywords: string[];
  matchMode: "any" | "all";
  caseSensitive?: boolean;
};

export type DemoRuleConfig = ThresholdConfig | RateConfig | KeywordConfig;

export interface DemoRule {
  id: string;
  name: string;
  enabled: boolean;
  config: DemoRuleConfig;
}

export interface DemoScenario {
  id: string;
  name: string;
  description: string;
  agent_name: string;
  icon: string; // feather icon name
  rules: DemoRule[];
}

export interface AgentRequest {
  sessionId: string;
  scenario: string;
  rules: DemoRule[];
  history: DemoEvent[];
}

export interface EvalRequest {
  events: DemoEvent[];
  rules: DemoRule[];
  allEvents: DemoEvent[]; // full session events for rate/threshold windowing
}

export interface EvalResult {
  event_id: string;
  triggered_rules: { rule_id: string; rule_name: string; type: string }[];
  blocked: boolean;
}

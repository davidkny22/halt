// Simulated agent events, rules, and kill switch scenarios for the demo page

const AGENT_NAMES = ["email-agent", "research-bot", "deploy-assistant"];

const TOOL_ACTIONS = [
  { action: "send_email -> marketing@acme.com", target: "email" },
  { action: "read_file -> /reports/quarterly.csv", target: "file" },
  { action: 'web_search -> "Q1 revenue trends"', target: "search" },
  { action: "write_file -> /tmp/analysis.md", target: "file" },
  { action: "send_email -> ops-team@acme.com", target: "email" },
  { action: "bash -> python analyze.py", target: "script" },
  { action: "read_file -> /data/users.json", target: "file" },
  { action: "send_slack -> #general", target: "slack" },
  { action: "web_search -> latest pricing data", target: "search" },
  { action: "write_file -> /output/report.pdf", target: "file" },
];

const LLM_ACTIONS = [
  { action: "claude-haiku -> 312 tokens ($0.001)", cost: 0.001 },
  { action: "claude-haiku -> 847 tokens ($0.002)", cost: 0.002 },
  { action: "claude-haiku -> 1,204 tokens ($0.003)", cost: 0.003 },
  { action: "claude-haiku -> 523 tokens ($0.001)", cost: 0.001 },
  { action: "claude-haiku -> 2,100 tokens ($0.005)", cost: 0.005 },
];

const LIFECYCLE_ACTIONS = [
  "Agent run started -- weekly email batch",
  "Agent run started -- research task",
  "Agent run started -- deployment check",
  "Agent session resumed",
];

const MESSAGE_ACTIONS = [
  'User: "Send the weekly report to all clients"',
  'User: "Summarize yesterday\'s logs"',
  'Agent: "Found 3 anomalies in the data"',
  'Agent: "Email sent successfully to 12 recipients"',
];

export interface DemoEvent {
  id: string;
  timestamp: string;
  event_type: string;
  action: string;
  severity_hint: "normal" | "elevated" | "critical";
  metadata: Record<string, unknown>;
  agent_name: string;
}

let eventCounter = 0;

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateEvent(forceType?: string): DemoEvent {
  eventCounter++;
  const id = `demo-${eventCounter}-${Date.now()}`;
  const timestamp = new Date().toISOString();
  const agent_name = randomFrom(AGENT_NAMES);

  const types = ["tool_use", "tool_use", "tool_use", "llm_call", "llm_call", "message_sent", "agent_lifecycle"];
  const event_type = forceType || randomFrom(types);

  let action = "";
  let metadata: Record<string, unknown> = {};

  switch (event_type) {
    case "tool_use": {
      const tool = randomFrom(TOOL_ACTIONS);
      action = tool.action;
      metadata = { tool_name: tool.action.split(" -> ")[0] };
      break;
    }
    case "llm_call": {
      const llm = randomFrom(LLM_ACTIONS);
      action = llm.action;
      metadata = { cost_usd: llm.cost, tokens_used: parseInt(llm.action.match(/[\d,]+/)?.[0]?.replace(",", "") || "0") };
      break;
    }
    case "message_sent":
    case "message_received":
      action = randomFrom(MESSAGE_ACTIONS);
      break;
    case "agent_lifecycle":
      action = randomFrom(LIFECYCLE_ACTIONS);
      break;
  }

  return { id, timestamp, event_type, action, severity_hint: "normal", metadata, agent_name };
}

export function generateAlertEvent(): DemoEvent {
  eventCounter++;
  return {
    id: `demo-alert-${eventCounter}-${Date.now()}`,
    timestamp: new Date().toISOString(),
    event_type: "tool_use",
    action: "send_email -> 23 emails sent in 5 min -- rate rule triggered",
    severity_hint: "elevated",
    metadata: { rule_triggered: "email-rate-limit", emails_sent: 23 },
    agent_name: "email-agent",
  };
}

export function generateKillEvent(): DemoEvent {
  eventCounter++;
  return {
    id: `demo-kill-${eventCounter}-${Date.now()}`,
    timestamp: new Date().toISOString(),
    event_type: "tool_use",
    action: 'bash("rm -rf /app/data") -- BLOCKED by kill switch',
    severity_hint: "critical",
    metadata: { blocked: true, rule: "keyword: rm -rf", kill_switch: true },
    agent_name: "deploy-assistant",
  };
}

export const DEMO_RULES = [
  {
    id: "demo-rule-1",
    name: "Email rate limit",
    rule_type: "rate",
    config: { event_type: "tool_use", max_count: 20, window_seconds: 300 },
    enabled: true,
  },
  {
    id: "demo-rule-2",
    name: "Block destructive commands",
    rule_type: "keyword",
    config: { keywords: ["rm -rf", "DROP TABLE", "format", "shutdown"] },
    enabled: true,
  },
  {
    id: "demo-rule-3",
    name: "Spend limit",
    rule_type: "threshold",
    config: { metric: "cost_usd", threshold: 10, window_seconds: 3600 },
    enabled: true,
  },
  {
    id: "demo-rule-4",
    name: "No access to /etc or system dirs",
    rule_type: "keyword",
    config: { keywords: ["/etc/", "/sys/", "/proc/"] },
    enabled: true,
  },
];

// Initial seed events so the feed isn't empty on load
export function generateSeedEvents(count: number): DemoEvent[] {
  const events: DemoEvent[] = [];
  const now = Date.now();
  for (let i = count; i > 0; i--) {
    const event = generateEvent();
    event.timestamp = new Date(now - i * 2500).toISOString();
    events.push(event);
  }
  return events;
}

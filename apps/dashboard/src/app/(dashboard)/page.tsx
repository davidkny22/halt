import { StatsRow } from "@/components/stats-row";
import { ActivityFeed } from "@/components/activity-feed";

// Placeholder data — will be fetched from API
const mockStats = [
  { label: "Events Today", value: 142 },
  { label: "Status", value: "Normal", color: "var(--color-green)" },
  { label: "Spend Today", value: "$2.41" },
  { label: "Alerts Today", value: 1, color: "var(--color-yellow)" },
];

const mockEvents = [
  {
    id: "1",
    timestamp: new Date().toISOString(),
    event_type: "tool_use",
    action: "send_email → marketing@client.com",
    severity_hint: "normal",
    metadata: { tool_name: "send_email" },
  },
  {
    id: "2",
    timestamp: new Date(Date.now() - 120000).toISOString(),
    event_type: "llm_call",
    action: "claude-haiku → 847 tokens ($0.002)",
    severity_hint: "normal",
    metadata: {},
  },
  {
    id: "3",
    timestamp: new Date(Date.now() - 180000).toISOString(),
    event_type: "tool_use",
    action: "15 emails sent in 10 min (elevated)",
    severity_hint: "elevated",
    metadata: { tool_name: "gmail_api" },
  },
  {
    id: "4",
    timestamp: new Date(Date.now() - 300000).toISOString(),
    event_type: "tool_use",
    action: "read_file → /templates/weekly-report.md",
    severity_hint: "normal",
    metadata: { tool_name: "read_file" },
  },
  {
    id: "5",
    timestamp: new Date(Date.now() - 360000).toISOString(),
    event_type: "agent_lifecycle",
    action: "Agent run started — weekly email batch",
    severity_hint: "normal",
    metadata: {},
  },
];

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <StatsRow stats={mockStats} />
      <ActivityFeed events={mockEvents} />
    </div>
  );
}

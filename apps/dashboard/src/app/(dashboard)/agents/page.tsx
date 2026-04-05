const mockAgents = [
  { id: "1", name: "Email Agent", agent_id: "email-agent", status: "active", events_today: 142 },
  { id: "2", name: "Sales Agent", agent_id: "sales-agent", status: "learning", events_today: 48 },
  { id: "3", name: "Deploy Agent", agent_id: "deploy-agent", status: "paused", events_today: 7 },
];

const statusColors: Record<string, string> = {
  active: "var(--color-green)",
  learning: "var(--color-yellow)",
  paused: "var(--color-red)",
};

export default function AgentsPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Agents</h1>
        <button
          className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ backgroundColor: "var(--color-coral)" }}
        >
          + Add Agent
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {mockAgents.map((agent) => (
          <div
            key={agent.id}
            className="p-5 rounded-lg"
            style={{
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)",
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold">{agent.name}</span>
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: statusColors[agent.status] }}
              />
            </div>
            <p className="text-xs mb-1" style={{ color: "var(--color-text-secondary)" }}>
              {agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}
              {agent.status === "learning" && " — 48h remaining"}
            </p>
            <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
              {agent.events_today} events today
            </p>
            {agent.status === "paused" && (
              <button
                className="mt-3 w-full py-2 rounded-lg text-xs font-semibold text-white"
                style={{ backgroundColor: "var(--color-coral)" }}
              >
                Resume Agent
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

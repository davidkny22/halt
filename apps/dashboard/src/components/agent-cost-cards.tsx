"use client";

interface AgentCost {
  agent_id: string;
  agent_name: string | null;
  cost: number;
  tokens: number;
  event_count: number;
}

export function AgentCostCards({ agents }: { agents: AgentCost[] }) {
  if (agents.length === 0) return null;

  const maxCost = Math.max(...agents.map((a) => a.cost));

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ border: "1px solid var(--color-border)" }}
    >
      <div
        className="px-4 py-3 font-semibold text-sm"
        style={{ borderBottom: "1px solid var(--color-border)" }}
      >
        Cost by Agent
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
        {agents.map((agent) => {
          const isTopSpender = agent.cost === maxCost && maxCost > 0;
          return (
            <div
              key={agent.agent_id}
              className="p-3 rounded-lg"
              style={{
                backgroundColor: "var(--color-surface)",
                border: isTopSpender
                  ? "1px solid var(--color-coral)"
                  : "1px solid var(--color-border)",
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className="text-xs font-medium truncate"
                  style={{ color: "var(--color-text)" }}
                >
                  {agent.agent_name || agent.agent_id.slice(0, 8)}
                </span>
                {isTopSpender && (
                  <span
                    className="text-[11px] px-1.5 py-0.5 rounded font-medium"
                    style={{
                      backgroundColor: "rgba(255, 107, 74, 0.1)",
                      color: "var(--color-coral)",
                    }}
                  >
                    Top
                  </span>
                )}
              </div>
              <div
                className="text-lg font-bold"
                style={{ color: isTopSpender ? "var(--color-coral)" : "var(--color-text)" }}
              >
                ${agent.cost.toFixed(2)}
              </div>
              <div className="flex gap-3 mt-1">
                <span className="text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>
                  {agent.tokens.toLocaleString()} tokens
                </span>
                <span className="text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>
                  {agent.event_count} events
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

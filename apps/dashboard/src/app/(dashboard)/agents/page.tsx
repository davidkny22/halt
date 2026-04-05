import { getAgents } from "@/lib/server-api";
import { CopyBlock } from "@/components/copy-block";

const statusColors: Record<string, string> = {
  active: "var(--color-green)",
  learning: "var(--color-yellow)",
  paused: "var(--color-red)",
};

export default async function AgentsPage() {
  const data = await getAgents();
  const agents = data?.agents ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Agents</h1>
      </div>

      {agents.length === 0 ? (
        <div
          className="rounded-lg p-8 text-center"
          style={{ border: "1px solid var(--color-border)" }}
        >
          <h2 className="text-lg font-semibold mb-2">No agents yet</h2>
          <p className="text-sm mb-6" style={{ color: "var(--color-text-secondary)" }}>
            Agents are automatically registered when the Clawnitor plugin sends its first event.
          </p>
          <div className="max-w-md mx-auto">
            <CopyBlock text="openclaw plugins install @clawnitor/plugin" />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent: any) => (
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
                  style={{
                    backgroundColor: statusColors[agent.status] || "var(--color-text-secondary)",
                  }}
                />
              </div>
              <p className="text-xs mb-1" style={{ color: "var(--color-text-secondary)" }}>
                {agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}
              </p>
              <p className="text-xs" style={{ color: "var(--color-text-tertiary)", fontFamily: "var(--font-mono)" }}>
                {agent.agent_id}
              </p>
              {agent.status === "paused" && agent.kill_reason && (
                <p className="text-xs mt-2" style={{ color: "var(--color-coral)" }}>
                  Paused: {agent.kill_reason}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

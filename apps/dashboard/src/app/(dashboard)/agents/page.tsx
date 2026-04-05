import { getAgents } from "@/lib/server-api";
import { CopyBlock } from "@/components/copy-block";
import { ActivateAgentButton } from "@/components/activate-agent-button";
import Link from "next/link";

const statusColors: Record<string, string> = {
  active: "var(--color-green)",
  learning: "var(--color-yellow)",
  paused: "var(--color-red)",
  discovered: "var(--color-text-tertiary)",
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
            Agents are automatically discovered when the halt plugin starts. Install the plugin to get started.
          </p>
          <div className="max-w-md mx-auto flex flex-col gap-2">
            <CopyBlock text="openclaw plugins install @halt/plugin" />
            <CopyBlock text="npx halt init" />
          </div>
        </div>
      ) : (
        <>
          {(() => {
            const monitored = agents.filter((a: any) => a.status !== "discovered");
            const discovered = agents.filter((a: any) => a.status === "discovered");
            return (
              <>
                {monitored.length > 0 && (
                  <div className="mb-8">
                    <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--color-text-secondary)" }}>
                      Monitored
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {monitored.map((agent: any) => (
                        <Link
                          key={agent.id}
                          href={`/agents/${agent.id}`}
                          className="p-5 rounded-lg block transition-all hover:scale-[1.02]"
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
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {discovered.length > 0 && (
                  <div>
                    <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--color-text-tertiary)" }}>
                      Discovered
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {discovered.map((agent: any) => (
                        <div
                          key={agent.id}
                          className="p-5 rounded-lg"
                          style={{
                            backgroundColor: "var(--color-surface)",
                            border: "1px dashed var(--color-border)",
                            opacity: 0.75,
                          }}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <span className="font-semibold">{agent.name}</span>
                            <span
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: "var(--color-text-tertiary)" }}
                            />
                          </div>
                          <p className="text-xs" style={{ color: "var(--color-text-tertiary)", fontFamily: "var(--font-mono)" }}>
                            {agent.agent_id}
                          </p>
                          <div className="flex items-center justify-between mt-3">
                            <span className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
                              Not yet monitored
                            </span>
                            <ActivateAgentButton agentId={agent.id} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </>
      )}
    </div>
  );
}

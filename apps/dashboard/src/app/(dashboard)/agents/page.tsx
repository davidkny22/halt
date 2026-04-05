import { getUserInfo } from "@/lib/server-api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const statusColors: Record<string, string> = {
  active: "var(--color-green)",
  learning: "var(--color-yellow)",
  paused: "var(--color-red)",
};

async function getAgents(email: string) {
  try {
    const userRes = await fetch(
      `${API_URL}/api/auth/me?email=${encodeURIComponent(email)}`,
      { cache: "no-store" }
    );
    if (!userRes.ok) return [];
    // For now return empty — agents are fetched via API key auth
    // which requires the plugin to have sent events first
    return [];
  } catch {
    return [];
  }
}

export default async function AgentsPage() {
  const user = await getUserInfo();
  const agents: any[] = [];

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
          <p className="text-sm mb-4" style={{ color: "var(--color-text-secondary)" }}>
            Agents are automatically registered when the Clawnitor plugin sends its first event.
          </p>
          <div
            className="inline-block px-4 py-3 rounded-lg text-sm text-left"
            style={{
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              fontFamily: "var(--font-mono)",
            }}
          >
            <div style={{ color: "var(--color-coral)" }}>
              $ openclaw plugins install @clawnitor/plugin
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
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
                  style={{ backgroundColor: statusColors[agent.status] || "var(--color-text-secondary)" }}
                />
              </div>
              <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                {agent.status}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

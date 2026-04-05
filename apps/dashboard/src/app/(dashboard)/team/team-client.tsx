"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StatsRow } from "@/components/stats-row";

const statusColors: Record<string, string> = {
  active: "var(--color-green)",
  learning: "var(--color-yellow)",
  paused: "var(--color-red)",
};

interface TeamData {
  team: any;
  members: any[];
  agents: any[];
  shared_rules: any[];
  agent_count: number;
  max_agents: number;
}

type Tab = "overview" | "agents" | "rules" | "members";

export function TeamClient({
  teamData,
  tier,
}: {
  teamData: TeamData | { team: null } | null;
  tier: string;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [creating, setCreating] = useState(false);
  const [teamName, setTeamName] = useState("");
  const router = useRouter();

  const hasTeam = teamData && "team" in teamData && teamData.team;
  const isTeamTier = tier === "team" || tier === "paid" || tier === "trial";

  async function handleCreateTeam() {
    if (!teamName.trim()) return;
    setCreating(true);
    try {
      await fetch("/api/team-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", name: teamName }),
      });
      router.refresh();
    } finally {
      setCreating(false);
    }
  }

  // No team yet — show create team prompt
  if (!hasTeam) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Team</h1>
        <div
          className="rounded-lg p-8 text-center max-w-md mx-auto"
          style={{ border: "1px solid var(--color-border)" }}
        >
          <h2 className="text-lg font-semibold mb-2">Create a Team</h2>
          <p className="text-sm mb-6" style={{ color: "var(--color-text-secondary)" }}>
            Collaborate with others to monitor agents together. Free teams get up to 2 members.
          </p>
          <div className="flex gap-2 mb-4">
            <input
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Team name"
              className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
              style={{
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text)",
              }}
            />
            <button
              onClick={handleCreateTeam}
              disabled={creating || !teamName.trim()}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white cursor-pointer disabled:opacity-50"
              style={{ backgroundColor: "var(--color-coral)" }}
            >
              {creating ? "..." : "Create"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const team = (teamData as TeamData).team;
  const members = (teamData as TeamData).members || [];
  const agents = (teamData as TeamData).agents || [];
  const sharedRules = (teamData as TeamData).shared_rules || [];

  const teamStats = [
    { label: "Total Agents", value: agents.length },
    { label: "Active", value: agents.filter((a: any) => a.status === "active").length, color: "var(--color-green)" },
    { label: "Members", value: members.length },
    { label: "Shared Rules", value: sharedRules.length },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{team.name}</h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
            {agents.length} agents — {members.length} members
          </p>
        </div>
        <span
          className="text-xs px-3 py-1 rounded-full font-medium"
          style={{
            backgroundColor: isTeamTier ? "rgba(56, 189, 248, 0.15)" : "var(--color-coral-soft)",
            color: isTeamTier ? "var(--color-sky)" : "var(--color-coral)",
          }}
        >
          {isTeamTier ? "Team Plan" : "Free Team"}
        </span>
      </div>

      {/* Upgrade banner for free/pro teams */}
      {!isTeamTier && (
        <div
          className="p-4 rounded-lg mb-6 text-sm"
          style={{
            background: "linear-gradient(135deg, rgba(255, 107, 74, 0.1) 0%, rgba(255, 107, 74, 0.02) 100%)",
            border: "1px solid rgba(255, 107, 74, 0.2)",
          }}
        >
          <strong>Unlock shared rules, unlimited members, and more</strong> — upgrade to the Team plan for $19/mo.
        </div>
      )}

      {/* Tabs */}
      <div
        className="flex gap-1 mb-6 p-1 rounded-lg w-fit"
        style={{ backgroundColor: "var(--color-surface)" }}
      >
        {(["overview", "agents", "rules", "members"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer"
            style={{
              backgroundColor: activeTab === tab ? "var(--color-bg)" : "transparent",
              color: activeTab === tab ? "var(--color-text)" : "var(--color-text-secondary)",
            }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeTab === "overview" && (
        <div>
          <StatsRow stats={teamStats} />
          {agents.length === 0 ? (
            <div className="rounded-lg p-6 text-center text-sm" style={{ border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}>
              No agents yet. Team agents appear when members install the Halt plugin.
            </div>
          ) : (
            <div className="rounded-lg" style={{ border: "1px solid var(--color-border)" }}>
              <div className="px-4 py-3 font-semibold text-sm" style={{ borderBottom: "1px solid var(--color-border)" }}>
                Team Agents
              </div>
              {agents.map((agent: any) => (
                <div
                  key={agent.id}
                  className="flex items-center justify-between px-4 py-3 text-sm"
                  style={{ borderBottom: "1px solid var(--color-border)" }}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColors[agent.status] || "var(--color-text-secondary)" }} />
                    <span className="font-medium">{agent.name}</span>
                  </div>
                  <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{agent.owner_email}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Agents tab */}
      {activeTab === "agents" && (
        <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--color-border)" }}>
          {agents.length === 0 ? (
            <div className="p-8 text-center text-sm" style={{ color: "var(--color-text-secondary)" }}>
              No team agents yet.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <th className="text-left px-4 py-3 font-medium text-xs" style={{ color: "var(--color-text-secondary)" }}>Agent</th>
                  <th className="text-left px-4 py-3 font-medium text-xs" style={{ color: "var(--color-text-secondary)" }}>Status</th>
                  <th className="text-left px-4 py-3 font-medium text-xs" style={{ color: "var(--color-text-secondary)" }}>Owner</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((agent: any) => (
                  <tr key={agent.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                    <td className="px-4 py-3 font-medium">{agent.name}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5 text-xs">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColors[agent.status] }} />
                        {agent.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--color-text-secondary)" }}>{agent.owner_email || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Rules tab — gated for non-team tiers */}
      {activeTab === "rules" && (
        <div>
          {!isTeamTier ? (
            <div className="rounded-lg p-8 text-center" style={{ border: "1px solid var(--color-border)" }}>
              <h2 className="text-lg font-semibold mb-2">Shared Rules</h2>
              <p className="text-sm mb-4" style={{ color: "var(--color-text-secondary)" }}>
                Shared rules apply across all agents in your team. Available on the Team plan.
              </p>
              <button
                className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white cursor-pointer"
                style={{ backgroundColor: "var(--color-coral)" }}
              >
                Upgrade to Team — $19/mo
              </button>
            </div>
          ) : sharedRules.length === 0 ? (
            <div className="rounded-lg p-8 text-center" style={{ border: "1px solid var(--color-border)" }}>
              <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                No shared rules yet. Create one to apply across all team agents.
              </p>
            </div>
          ) : (
            <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--color-border)" }}>
              {sharedRules.map((rule: any) => (
                <div
                  key={rule.id}
                  className="flex items-center justify-between px-4 py-3 text-sm"
                  style={{ borderBottom: "1px solid var(--color-border)" }}
                >
                  <span className="font-medium">{rule.name}</span>
                  <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: "var(--color-surface)", color: "var(--color-text-secondary)" }}>
                    {rule.rule_type}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Members tab */}
      {activeTab === "members" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {members.map((member: any) => (
            <div
              key={member.id}
              className="p-5 rounded-xl"
              style={{
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-border)",
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-sm">{member.email}</span>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                  style={{
                    backgroundColor: member.role === "admin" ? "var(--color-coral-soft)" : "var(--color-surface)",
                    color: member.role === "admin" ? "var(--color-coral)" : "var(--color-text-secondary)",
                    border: member.role !== "admin" ? "1px solid var(--color-border)" : "none",
                  }}
                >
                  {member.role}
                </span>
              </div>
              <p className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
                Joined {new Date(member.joined_at).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

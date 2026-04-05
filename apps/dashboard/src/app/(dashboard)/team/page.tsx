"use client";

import { useState } from "react";
import { StatsRow } from "@/components/stats-row";

const teamStats = [
  { label: "Total Agents", value: 8, color: "var(--color-text)" },
  { label: "Active", value: 6, color: "var(--color-green)" },
  { label: "Paused", value: 1, color: "var(--color-red)" },
  { label: "Learning", value: 1, color: "var(--color-yellow)" },
];

const overviewStats = [
  { label: "Events Today", value: "4,291" },
  { label: "Total Spend", value: "$12.47" },
  { label: "Alerts Today", value: 5, color: "var(--color-yellow)" },
  { label: "Rules Active", value: 14 },
];

const agents = [
  { id: "1", name: "Email Agent", agent_id: "email-agent", status: "active", events: 1847, spend: "$4.21", alerts: 2, owner: "David K." },
  { id: "2", name: "Sales Outreach", agent_id: "sales-agent", status: "active", events: 923, spend: "$3.12", alerts: 1, owner: "David K." },
  { id: "3", name: "Content Writer", agent_id: "content-agent", status: "active", events: 412, spend: "$1.87", alerts: 0, owner: "Sarah M." },
  { id: "4", name: "Code Reviewer", agent_id: "code-review", status: "active", events: 356, spend: "$1.44", alerts: 1, owner: "Alex T." },
  { id: "5", name: "Data Pipeline", agent_id: "data-pipeline", status: "active", events: 289, spend: "$0.98", alerts: 0, owner: "Sarah M." },
  { id: "6", name: "Support Bot", agent_id: "support-bot", status: "active", events: 201, spend: "$0.62", alerts: 1, owner: "Alex T." },
  { id: "7", name: "Deploy Agent", agent_id: "deploy-agent", status: "paused", events: 7, spend: "$0.03", alerts: 0, owner: "David K." },
  { id: "8", name: "New Research Agent", agent_id: "research", status: "learning", events: 256, spend: "$0.20", alerts: 0, owner: "Sarah M." },
];

const sharedRules = [
  { id: "1", name: "Global spend limit", type: "threshold", scope: "All agents", enabled: true, triggers: 3 },
  { id: "2", name: "Production keyword guard", type: "keyword", scope: "All agents", enabled: true, triggers: 7 },
  { id: "3", name: "Email rate limit", type: "rate", scope: "Email, Sales", enabled: true, triggers: 12 },
  { id: "4", name: "Deployment monitor", type: "keyword", scope: "Deploy, Code Review", enabled: true, triggers: 1 },
  { id: "5", name: "Agent confusion detector", type: "nl", scope: "All agents", enabled: true, triggers: 2 },
];

const members = [
  { name: "David K.", email: "david@clawnitor.io", role: "Admin", agents: 3 },
  { name: "Sarah M.", email: "sarah@team.com", role: "Member", agents: 3 },
  { name: "Alex T.", email: "alex@team.com", role: "Member", agents: 2 },
];

const statusColors: Record<string, string> = {
  active: "var(--color-green)",
  learning: "var(--color-yellow)",
  paused: "var(--color-red)",
};

const typeColors: Record<string, string> = {
  threshold: "var(--color-coral)",
  rate: "var(--color-sky)",
  keyword: "var(--color-purple)",
  nl: "var(--color-green)",
};

type Tab = "overview" | "agents" | "rules" | "members";

export default function TeamDashboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Team Dashboard</h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
            10 agents included — 8 in use — 2 available
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-xs px-3 py-1 rounded-full font-medium"
            style={{
              backgroundColor: "rgba(56, 189, 248, 0.15)",
              color: "var(--color-sky)",
            }}
          >
            Team Plan
          </span>
          <button
            className="text-xs px-3 py-1.5 rounded-lg font-medium"
            style={{
              border: "1px solid var(--color-border)",
              color: "var(--color-text-secondary)",
            }}
          >
            Invite Member
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div
        className="flex gap-1 mb-6 p-1 rounded-lg w-fit"
        style={{ backgroundColor: "var(--color-surface)" }}
      >
        {(["overview", "agents", "rules", "members"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
            style={{
              backgroundColor:
                activeTab === tab ? "var(--color-bg)" : "transparent",
              color:
                activeTab === tab
                  ? "var(--color-text)"
                  : "var(--color-text-secondary)",
            }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div>
          <StatsRow stats={teamStats} />
          <StatsRow stats={overviewStats} />

          {/* Recent activity across all agents */}
          <div
            className="rounded-lg overflow-hidden"
            style={{ border: "1px solid var(--color-border)" }}
          >
            <div
              className="px-4 py-3 font-semibold text-sm flex items-center justify-between"
              style={{ borderBottom: "1px solid var(--color-border)" }}
            >
              <span>Team Activity</span>
              <span
                className="text-xs font-normal"
                style={{ color: "var(--color-text-tertiary)" }}
              >
                All agents
              </span>
            </div>
            {[
              { time: "2:41 PM", agent: "Email Agent", type: "tool", color: "var(--color-sky)", text: "send_email → marketing@client.com", sev: "normal" },
              { time: "2:40 PM", agent: "Sales Outreach", type: "llm", color: "var(--color-purple)", text: "claude-haiku → 1,204 tokens", sev: "normal" },
              { time: "2:38 PM", agent: "Email Agent", type: "alert", color: "var(--color-coral)", text: "15 emails in 10 min — rule triggered", sev: "elevated" },
              { time: "2:37 PM", agent: "Code Reviewer", type: "tool", color: "var(--color-sky)", text: "read_file → /src/auth/middleware.ts", sev: "normal" },
              { time: "2:35 PM", agent: "Content Writer", type: "llm", color: "var(--color-purple)", text: "claude-sonnet → 3,847 tokens", sev: "normal" },
              { time: "2:34 PM", agent: "Support Bot", type: "alert", color: "var(--color-coral)", text: "Unfamiliar API endpoint accessed", sev: "elevated" },
              { time: "2:33 PM", agent: "Data Pipeline", type: "tool", color: "var(--color-sky)", text: "query_db → analytics.events", sev: "normal" },
              { time: "2:30 PM", agent: "Research Agent", type: "start", color: "var(--color-green)", text: "Session started — learning mode", sev: "normal" },
            ].map((e, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-4 py-2 text-xs"
                style={{
                  borderBottom: "1px solid var(--color-border)",
                  backgroundColor: e.sev === "elevated" ? "var(--color-coral-soft)" : "transparent",
                  borderLeft: e.sev === "elevated" ? "2px solid var(--color-coral)" : "2px solid transparent",
                }}
              >
                <span style={{ color: "var(--color-text-tertiary)", minWidth: "48px" }}>{e.time}</span>
                <span
                  className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                  style={{
                    backgroundColor: "var(--color-surface)",
                    color: "var(--color-text-secondary)",
                    minWidth: "90px",
                    textAlign: "center",
                  }}
                >
                  {e.agent}
                </span>
                <span style={{ color: e.color, minWidth: "32px" }}>{e.type}</span>
                <span style={{ color: e.sev === "elevated" ? "var(--color-coral)" : "var(--color-text-secondary)" }}>
                  {e.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Agents Tab */}
      {activeTab === "agents" && (
        <div
          className="rounded-lg overflow-hidden"
          style={{ border: "1px solid var(--color-border)" }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                <th className="text-left px-4 py-3 font-medium text-xs" style={{ color: "var(--color-text-secondary)" }}>Agent</th>
                <th className="text-left px-4 py-3 font-medium text-xs" style={{ color: "var(--color-text-secondary)" }}>Status</th>
                <th className="text-right px-4 py-3 font-medium text-xs" style={{ color: "var(--color-text-secondary)" }}>Events</th>
                <th className="text-right px-4 py-3 font-medium text-xs" style={{ color: "var(--color-text-secondary)" }}>Spend</th>
                <th className="text-right px-4 py-3 font-medium text-xs" style={{ color: "var(--color-text-secondary)" }}>Alerts</th>
                <th className="text-left px-4 py-3 font-medium text-xs" style={{ color: "var(--color-text-secondary)" }}>Owner</th>
                <th className="text-right px-4 py-3 font-medium text-xs" style={{ color: "var(--color-text-secondary)" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((agent) => (
                <tr key={agent.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-sm">{agent.name}</div>
                    <div className="text-[10px]" style={{ color: "var(--color-text-tertiary)", fontFamily: "var(--font-mono)" }}>{agent.agent_id}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5 text-xs">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColors[agent.status] }} />
                      {agent.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-xs" style={{ fontFamily: "var(--font-mono)" }}>{agent.events.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-xs" style={{ fontFamily: "var(--font-mono)" }}>{agent.spend}</td>
                  <td className="px-4 py-3 text-right">
                    {agent.alerts > 0 ? (
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "var(--color-coral-soft)", color: "var(--color-coral)" }}>
                        {agent.alerts}
                      </span>
                    ) : (
                      <span className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>0</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: "var(--color-text-secondary)" }}>{agent.owner}</td>
                  <td className="px-4 py-3 text-right">
                    {agent.status === "paused" ? (
                      <button className="text-xs px-3 py-1 rounded font-medium text-white" style={{ backgroundColor: "var(--color-coral)" }}>Resume</button>
                    ) : (
                      <button className="text-xs px-3 py-1 rounded" style={{ color: "var(--color-text-tertiary)" }}>View</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Rules Tab */}
      {activeTab === "rules" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
              Shared rules apply across multiple agents in your team.
            </p>
            <button
              className="px-4 py-2 rounded-lg text-xs font-semibold text-white"
              style={{ backgroundColor: "var(--color-coral)" }}
            >
              + Create Shared Rule
            </button>
          </div>
          <div
            className="rounded-lg overflow-hidden"
            style={{ border: "1px solid var(--color-border)" }}
          >
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <th className="text-left px-4 py-3 font-medium text-xs" style={{ color: "var(--color-text-secondary)" }}>Rule</th>
                  <th className="text-left px-4 py-3 font-medium text-xs" style={{ color: "var(--color-text-secondary)" }}>Type</th>
                  <th className="text-left px-4 py-3 font-medium text-xs" style={{ color: "var(--color-text-secondary)" }}>Scope</th>
                  <th className="text-right px-4 py-3 font-medium text-xs" style={{ color: "var(--color-text-secondary)" }}>Triggers (7d)</th>
                  <th className="text-right px-4 py-3 font-medium text-xs" style={{ color: "var(--color-text-secondary)" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sharedRules.map((rule) => (
                  <tr key={rule.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                    <td className="px-4 py-3 font-medium text-sm">{rule.name}</td>
                    <td className="px-4 py-3">
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-medium"
                        style={{ backgroundColor: "var(--color-surface)", color: typeColors[rule.type] }}
                      >
                        {rule.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--color-text-secondary)" }}>{rule.scope}</td>
                    <td className="px-4 py-3 text-right text-xs" style={{ fontFamily: "var(--font-mono)" }}>{rule.triggers}</td>
                    <td className="px-4 py-3 text-right">
                      <button className="text-xs px-3 py-1 rounded" style={{ color: "var(--color-text-tertiary)" }}>Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Members Tab */}
      {activeTab === "members" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
              Manage who has access to your team dashboard.
            </p>
            <button
              className="px-4 py-2 rounded-lg text-xs font-semibold text-white"
              style={{ backgroundColor: "var(--color-coral)" }}
            >
              + Invite Member
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {members.map((member) => (
              <div
                key={member.email}
                className="p-5 rounded-xl"
                style={{
                  backgroundColor: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="font-semibold text-sm">{member.name}</div>
                    <div className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>{member.email}</div>
                  </div>
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                    style={{
                      backgroundColor: member.role === "Admin" ? "var(--color-coral-soft)" : "var(--color-surface)",
                      color: member.role === "Admin" ? "var(--color-coral)" : "var(--color-text-secondary)",
                      border: member.role !== "Admin" ? "1px solid var(--color-border)" : "none",
                    }}
                  >
                    {member.role}
                  </span>
                </div>
                <div className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                  {member.agents} agent{member.agents !== 1 ? "s" : ""} assigned
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

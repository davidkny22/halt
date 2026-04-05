"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { SessionTimeline } from "@/components/session-timeline";

interface AutoKillConfig {
  enabled: boolean;
  threshold: number;
  windowMinutes: number;
}

interface AgentConfig {
  agent_id: string;
  name: string;
  status: string;
  auto_kill: AutoKillConfig;
}

const WINDOW_OPTIONS = [
  { value: 5, label: "5 minutes" },
  { value: 10, label: "10 minutes" },
  { value: 15, label: "15 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 60, label: "60 minutes" },
];

type Tab = "overview" | "sessions";

export default function AgentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const agentId = params.id as string;

  const [config, setConfig] = useState<AgentConfig | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  // Local form state
  const [enabled, setEnabled] = useState(true);
  const [threshold, setThreshold] = useState(3);
  const [windowMinutes, setWindowMinutes] = useState(10);

  useEffect(() => {
    async function load() {
      try {
        const [configRes, sessionsRes] = await Promise.all([
          fetch("/api/agents-action", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "get-agent-config", agentId }),
          }),
          fetch("/api/agents-action", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "get-sessions", agentId }),
          }),
        ]);
        if (configRes.ok) {
          const data = await configRes.json();
          setConfig(data);
          setEnabled(data.auto_kill?.enabled ?? true);
          setThreshold(data.auto_kill?.threshold ?? 3);
          setWindowMinutes(data.auto_kill?.windowMinutes ?? 10);
        }
        if (sessionsRes.ok) {
          const data = await sessionsRes.json();
          setSessions(data.sessions || []);
        }
      } catch {}
      setLoading(false);
    }
    load();
  }, [agentId]);

  const saveAutoKill = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/agents-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update-auto-kill",
          agentId,
          enabled,
          threshold,
          windowMinutes,
        }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch {}
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>Loading agent...</span>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="text-center py-20">
        <h2 className="text-lg font-semibold mb-2">Agent not found</h2>
        <Link href="/agents" className="text-sm" style={{ color: "var(--color-coral)" }}>
          Back to agents
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/agents" className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
          Agents
        </Link>
        <span style={{ color: "var(--color-text-tertiary)" }}>/</span>
        <h1 className="text-2xl font-bold">{config.name}</h1>
        <span
          className="text-xs font-medium px-2 py-0.5 rounded-full"
          style={{
            backgroundColor: config.status === "active" ? "rgba(74, 222, 128, 0.1)" : "rgba(239, 68, 68, 0.1)",
            color: config.status === "active" ? "var(--color-green)" : "var(--color-coral)",
          }}
        >
          {config.status}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6">
        {([
          { key: "overview" as Tab, label: "Overview" },
          { key: "sessions" as Tab, label: `Sessions${sessions.length > 0 ? ` (${sessions.length})` : ""}` },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            style={{
              color: activeTab === tab.key ? "var(--color-text)" : "var(--color-text-secondary)",
              backgroundColor: activeTab === tab.key ? "var(--color-surface)" : "transparent",
              border: activeTab === tab.key ? "1px solid var(--color-border)" : "1px solid transparent",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <>
          {/* Agent ID */}
          <div
            className="rounded-lg p-5 mb-6"
            style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
          >
            <div className="text-xs font-medium mb-1" style={{ color: "var(--color-text-secondary)" }}>
              Agent ID
            </div>
            <code className="text-sm" style={{ color: "var(--color-text-tertiary)", fontFamily: "var(--font-mono)" }}>
              {config.agent_id}
            </code>
          </div>

          {/* Auto-Kill Settings */}
          <div
            className="rounded-lg p-6"
            style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold">Auto-Kill</h2>
                <p className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>
                  Automatically kill this agent after repeated rule violations.
                </p>
              </div>
              <button
                onClick={() => setEnabled(!enabled)}
                className="relative w-11 h-6 rounded-full transition-colors"
                style={{ backgroundColor: enabled ? "var(--color-coral)" : "var(--color-border)" }}
              >
                <span
                  className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform"
                  style={{ transform: enabled ? "translateX(20px)" : "translateX(0)" }}
                />
              </button>
            </div>

            {enabled && (
              <div className="flex flex-col gap-5">
                <div>
                  <label className="text-xs font-medium mb-2 block" style={{ color: "var(--color-text-secondary)" }}>
                    Kill after how many violations?
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={2}
                      max={50}
                      value={threshold}
                      onChange={(e) => setThreshold(parseInt(e.target.value) || 3)}
                      className="w-20 px-3 py-2 rounded-lg text-sm font-medium text-center"
                      style={{ backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
                    />
                    <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>violations</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium mb-2 block" style={{ color: "var(--color-text-secondary)" }}>
                    Within what time window?
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {WINDOW_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setWindowMinutes(opt.value)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                        style={{
                          backgroundColor: windowMinutes === opt.value ? "var(--color-coral)" : "var(--color-bg)",
                          color: windowMinutes === opt.value ? "white" : "var(--color-text-secondary)",
                          border: windowMinutes === opt.value ? "1px solid var(--color-coral)" : "1px solid var(--color-border)",
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div
                  className="rounded-lg px-4 py-3 text-xs"
                  style={{ backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}
                >
                  If this agent triggers <strong style={{ color: "var(--color-text)" }}>{threshold} rule violations</strong> within{" "}
                  <strong style={{ color: "var(--color-text)" }}>{windowMinutes} minutes</strong>,
                  Clawnitor will automatically kill it.
                </div>
              </div>
            )}

            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={saveAutoKill}
                disabled={saving}
                className="px-5 py-2 rounded-lg text-sm font-semibold text-white transition-opacity"
                style={{ backgroundColor: "var(--color-coral)", opacity: saving ? 0.6 : 1 }}
              >
                {saving ? "Saving..." : "Save Settings"}
              </button>
              {saved && (
                <span className="text-xs font-medium" style={{ color: "var(--color-green)" }}>Saved</span>
              )}
            </div>
          </div>
        </>
      )}

      {/* Sessions Tab */}
      {activeTab === "sessions" && (
        <SessionTimeline sessions={sessions} agentId={agentId} />
      )}
    </div>
  );
}

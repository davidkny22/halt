"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { LogoFull } from "@/components/logo";
import Link from "next/link";
import { SCENARIOS } from "./scenarios";
import type { DemoEvent, DemoRule, DemoRuleConfig, EvalResult } from "./demo-types";

type DemoState = "picking" | "running" | "paused";

const typeColors: Record<string, string> = {
  tool_use: "var(--color-sky)",
  llm_call: "var(--color-purple)",
  message_sent: "var(--color-green)",
  agent_lifecycle: "var(--color-text-secondary)",
};

const FEATHER_ICONS: Record<string, React.ReactNode> = {
  mail: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  ),
  terminal: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  ),
  "trending-up": (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  ),
  shield: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  "edit-3": (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  ),
};

function RuleTypeLabel({ type }: { type: string }) {
  const colors: Record<string, string> = {
    threshold: "var(--color-purple)",
    rate: "var(--color-sky)",
    keyword: "var(--color-coral)",
  };
  return (
    <span
      className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded"
      style={{
        color: colors[type] || "var(--color-text-secondary)",
        backgroundColor: `color-mix(in srgb, ${colors[type] || "var(--color-text-secondary)"} 15%, transparent)`,
      }}
    >
      {type}
    </span>
  );
}

function ruleDescription(config: DemoRuleConfig): string {
  switch (config.type) {
    case "threshold":
      return `${config.field} ${config.operator === "gt" ? ">" : "<"} ${config.value} over ${config.windowMinutes}min`;
    case "rate":
      return `Max ${config.maxCount} ${config.toolName || config.eventType || "events"} per ${config.windowMinutes}min`;
    case "keyword":
      return `Blocks: ${config.keywords.join(", ")}`;
  }
}

export default function DemoPage() {
  const [state, setState] = useState<DemoState>("picking");
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [rules, setRules] = useState<DemoRule[]>([]);
  const [events, setEvents] = useState<DemoEvent[]>([]);
  const [stats, setStats] = useState({ total: 0, blocked: 0, alerts: 0 });
  const [killActive, setKillActive] = useState(false);
  const killActiveRef = useRef(false);
  const [killAnimating, setKillAnimating] = useState(false);
  const [autoKilled, setAutoKilled] = useState(false);
  const [autoKillViolations, setAutoKillViolations] = useState<{ ruleName: string; action: string; timestamp: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddRule, setShowAddRule] = useState(false);
  const violationLogRef = useRef<{ timestamp: number; ruleName: string; action: string }[]>([]);
  const [newRule, setNewRule] = useState({ name: "", type: "keyword" as "keyword" | "threshold" | "rate", keywords: "", field: "", value: "", maxCount: "", windowMinutes: "5" });
  const sessionIdRef = useRef<string>("");
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const eventCountRef = useRef(0);

  const scenario = SCENARIOS.find((s) => s.id === selectedScenario);

  const startScenario = useCallback((scenarioId: string) => {
    const s = SCENARIOS.find((sc) => sc.id === scenarioId);
    if (!s) return;
    setSelectedScenario(scenarioId);
    setRules(s.rules.map((r) => ({ ...r })));
    setEvents([]);
    setStats({ total: 0, blocked: 0, alerts: 0 });
    setKillActive(false);
    setKillAnimating(false);
    sessionIdRef.current = crypto.randomUUID();
    eventCountRef.current = 0;
    setState("running");
  }, []);

  const fetchEvents = useCallback(async () => {
    if (killActiveRef.current || eventCountRef.current >= 50) return;

    setLoading(true);
    try {
      // Generate events from adversarial agent (8s timeout)
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const agentRes = await fetch("/api/demo/agent", {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          scenario: selectedScenario,
          rules: rules.filter((r) => r.enabled),
          history: events.slice(0, 10),
        }),
      });

      clearTimeout(timeout);
      if (!agentRes.ok) {
        console.error("Agent error:", agentRes.status);
        return;
      }

      const { events: newEvents } = await agentRes.json();
      if (!newEvents || newEvents.length === 0) return;

      // Evaluate against rules
      const evalRes = await fetch("/api/demo/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          events: newEvents,
          rules,
          allEvents: [...newEvents, ...events],
        }),
      });

      if (!evalRes.ok) return;

      const { results } = (await evalRes.json()) as { results: EvalResult[] };

      // Merge evaluation results into events
      const enrichedEvents: DemoEvent[] = newEvents.map((evt: DemoEvent) => {
        const result = results.find((r: EvalResult) => r.event_id === evt.id);
        return {
          ...evt,
          blocked: result?.blocked || false,
          triggered_rules: result?.triggered_rules || [],
        };
      });

      const blockedCount = enrichedEvents.filter((e: DemoEvent) => e.blocked).length;
      eventCountRef.current += enrichedEvents.length;

      // Bail if killed during the fetch
      if (killActiveRef.current) return;

      // Auto-kill: track violations in rolling 10-min window
      const now = Date.now();
      const AUTO_KILL_THRESHOLD = 3;
      const AUTO_KILL_WINDOW_MS = 10 * 60_000;

      for (const evt of enrichedEvents) {
        if (evt.blocked && evt.triggered_rules && evt.triggered_rules.length > 0) {
          violationLogRef.current.push({
            timestamp: now,
            ruleName: evt.triggered_rules[0].rule_name,
            action: evt.action,
          });
        }
      }

      // Prune old violations
      violationLogRef.current = violationLogRef.current.filter(
        (v) => v.timestamp > now - AUTO_KILL_WINDOW_MS
      );

      // Check auto-kill threshold
      if (violationLogRef.current.length >= AUTO_KILL_THRESHOLD && !killActiveRef.current) {
        killActiveRef.current = true;
        setAutoKilled(true);
        setAutoKillViolations(
          violationLogRef.current.map((v) => ({
            ruleName: v.ruleName,
            action: v.action,
            timestamp: new Date(v.timestamp).toLocaleTimeString(),
          }))
        );
        setKillActive(true);
        setKillAnimating(true);
        setTimeout(() => setKillAnimating(false), 2000);
      }

      setEvents((prev) => [...enrichedEvents, ...prev].slice(0, 100));
      setStats((prev) => ({
        total: prev.total + enrichedEvents.length,
        blocked: prev.blocked + blockedCount,
        alerts: prev.alerts + blockedCount,
      }));
    } catch (err) {
      console.error("Demo fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedScenario, rules, events, killActive]);

  // Polling
  useEffect(() => {
    if (state === "running" && !killActive) {
      // Fetch immediately on start, then every 2.5s
      fetchEvents();
      pollingRef.current = setInterval(fetchEvents, 2500);
      return () => {
        if (pollingRef.current) clearInterval(pollingRef.current);
      };
    } else {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }
  }, [state, killActive, fetchEvents]);

  const handleKill = () => {
    killActiveRef.current = true;
    setKillActive(true);
    setKillAnimating(true);
    setTimeout(() => setKillAnimating(false), 2000);
  };

  const handleReset = () => {
    setState("picking");
    setSelectedScenario(null);
    setRules([]);
    setEvents([]);
    setStats({ total: 0, blocked: 0, alerts: 0 });
    killActiveRef.current = false;
    setKillActive(false);
    setAutoKilled(false);
    setAutoKillViolations([]);
    violationLogRef.current = [];
    eventCountRef.current = 0;
  };

  const toggleRule = (ruleId: string) => {
    setRules((prev) => prev.map((r) => (r.id === ruleId ? { ...r, enabled: !r.enabled } : r)));
  };

  const addRule = () => {
    let config: DemoRuleConfig;
    switch (newRule.type) {
      case "keyword":
        config = { type: "keyword", keywords: newRule.keywords.split(",").map((k) => k.trim()).filter(Boolean), matchMode: "any" };
        break;
      case "threshold":
        config = { type: "threshold", field: newRule.field || "cost_usd", operator: "gt", value: parseFloat(newRule.value) || 10, windowMinutes: parseInt(newRule.windowMinutes) || 5 };
        break;
      case "rate":
        config = { type: "rate", eventType: "tool_use", maxCount: parseInt(newRule.maxCount) || 10, windowMinutes: parseInt(newRule.windowMinutes) || 5 };
        break;
    }
    setRules((prev) => [...prev, { id: `custom_${Date.now()}`, name: newRule.name || `Custom ${newRule.type} rule`, enabled: true, config }]);
    setShowAddRule(false);
    setNewRule({ name: "", type: "keyword", keywords: "", field: "", value: "", maxCount: "", windowMinutes: "5" });
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--color-bg)" }}>
      {/* Banner */}
      <div
        className="text-center py-2.5 px-4 text-xs font-medium"
        style={{
          backgroundColor: "var(--color-coral-soft)",
          color: "var(--color-coral)",
          borderBottom: "1px solid rgba(255, 107, 74, 0.2)",
        }}
      >
        Interactive demo with a live AI agent.{" "}
        <Link href="https://app.clawnitor.io/signup" className="underline font-semibold">
          Sign up
        </Link>{" "}
        to monitor your own agents.
      </div>

      {/* Nav */}
      <nav
        className="flex items-center justify-between px-6 py-4"
        style={{ borderBottom: "1px solid var(--color-border)" }}
      >
        <div className="flex items-center gap-4">
          <Link href="/">
            <LogoFull size={22} />
          </Link>
          <span
            className="text-xs font-medium px-2.5 py-1 rounded-full"
            style={{
              backgroundColor: "var(--color-coral-soft)",
              color: "var(--color-coral)",
              border: "1px solid rgba(255, 107, 74, 0.2)",
            }}
          >
            Live Demo
          </span>
        </div>
        <Link
          href="https://app.clawnitor.io/signup"
          className="text-sm font-semibold px-4 py-2 rounded-lg text-white"
          style={{ backgroundColor: "var(--color-coral)" }}
        >
          Start Monitoring Free
        </Link>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* ═══════════════ SCENARIO PICKER ═══════════════ */}
        {state === "picking" && (
          <div>
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold mb-2">Watch an AI agent try to break your rules.</h1>
              <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                Clawnitor stops it. Pick a scenario to see how.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
              {SCENARIOS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => startScenario(s.id)}
                  className="text-left p-6 rounded-xl transition-all hover:scale-[1.02]"
                  style={{
                    backgroundColor: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{
                        backgroundColor: "var(--color-coral-soft)",
                        color: "var(--color-coral)",
                      }}
                    >
                      {FEATHER_ICONS[s.icon]}
                    </div>
                    <h3 className="font-semibold">{s.name}</h3>
                  </div>
                  <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                    {s.description}
                  </p>
                  {s.rules.length > 0 && (
                    <div className="mt-3 text-xs" style={{ color: "var(--color-text-tertiary)" }}>
                      {s.rules.length} pre-built rule{s.rules.length > 1 ? "s" : ""}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ═══════════════ RUNNING / PAUSED ═══════════════ */}
        {(state === "running" || state === "paused") && (
          <div>
            {/* Top bar */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-bold">{scenario?.name}</h2>
                <div className="flex items-center gap-2">
                  {state === "running" && !killActive && (
                    <span className="relative flex h-2 w-2">
                      <span
                        className="absolute inline-flex h-full w-full rounded-full opacity-75"
                        style={{ backgroundColor: "var(--color-green)", animation: "ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite" }}
                      />
                      <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: "var(--color-green)" }} />
                    </span>
                  )}
                  {killActive && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded" style={{ backgroundColor: "rgba(239, 68, 68, 0.15)", color: "var(--color-coral)" }}>
                      KILLED
                    </span>
                  )}
                  {loading && !killActive && (
                    <span className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>thinking...</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!killActive && (
                  <button
                    onClick={() => setState(state === "running" ? "paused" : "running")}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium"
                    style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
                  >
                    {state === "running" ? "Pause" : "Resume"}
                  </button>
                )}
                <button
                  onClick={handleReset}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium"
                  style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="p-4 rounded-lg text-center" style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>Events</div>
              </div>
              <div className="p-4 rounded-lg text-center" style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                <div className="text-2xl font-bold" style={{ color: stats.blocked > 0 ? "var(--color-coral)" : "var(--color-text)" }}>{stats.blocked}</div>
                <div className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>Blocked</div>
              </div>
              <div className="p-4 rounded-lg text-center" style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                <div className="text-2xl font-bold" style={{ color: stats.alerts > 0 ? "var(--color-coral)" : "var(--color-text)" }}>{stats.alerts}</div>
                <div className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>Alerts</div>
              </div>
            </div>

            {/* Main layout */}
            <div className="flex gap-6">
              {/* Left: Event Feed */}
              <div className="flex-1 min-w-0">
                <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--color-border)" }}>
                  <div className="flex items-center justify-between px-4 py-3 font-semibold text-sm" style={{ borderBottom: "1px solid var(--color-border)" }}>
                    <span>Event Feed</span>
                    <span className="text-xs font-normal" style={{ color: "var(--color-text-tertiary)" }}>
                      {eventCountRef.current}/50 events
                    </span>
                  </div>
                  <div className="divide-y max-h-[500px] overflow-y-auto" style={{ borderColor: "var(--color-border)" }}>
                    {events.length === 0 && (
                      <div className="px-4 py-12 text-center text-sm" style={{ color: "var(--color-text-tertiary)" }}>
                        {state === "running" ? "Agent is thinking..." : "No events yet"}
                      </div>
                    )}
                    {events.map((event, i) => (
                      <div
                        key={event.id + i}
                        className="flex items-start gap-3 px-4 py-2.5 text-xs"
                        style={{
                          backgroundColor: event.blocked ? "rgba(255, 107, 74, 0.08)" : "transparent",
                          borderLeft: event.blocked ? "3px solid var(--color-coral)" : "3px solid transparent",
                          animation: i === 0 ? "fadeIn 0.3s ease-out" : undefined,
                        }}
                      >
                        <span style={{ color: "var(--color-text-tertiary)", minWidth: "48px", flexShrink: 0 }}>
                          {new Date(event.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </span>
                        <span
                          className="font-medium"
                          style={{ color: typeColors[event.event_type] || "var(--color-text-secondary)", minWidth: "55px", flexShrink: 0 }}
                        >
                          {event.event_type.replace("_", " ")}
                        </span>
                        <div className="min-w-0 flex-1">
                          <span
                            style={{
                              color: event.blocked ? "var(--color-coral)" : "var(--color-text-secondary)",
                              textDecoration: event.blocked ? "line-through" : "none",
                            }}
                          >
                            {event.action} {event.target && `→ ${event.target}`}
                          </span>
                          {event.blocked && event.triggered_rules && event.triggered_rules.length > 0 && (
                            <div className="mt-1 text-[10px] font-medium" style={{ color: "var(--color-coral)" }}>
                              Blocked by: {event.triggered_rules.map((r) => r.rule_name).join(", ")}
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] shrink-0" style={{ color: "var(--color-text-tertiary)" }}>
                          {event.agent_name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: Rules + Kill Switch */}
              <div className="w-80 shrink-0 flex flex-col gap-4">
                {/* Kill Switch */}
                <button
                  onClick={handleKill}
                  disabled={killActive}
                  className="w-full py-4 rounded-xl font-bold text-sm transition-all"
                  style={{
                    backgroundColor: killActive ? "rgba(239, 68, 68, 0.15)" : "var(--color-coral)",
                    color: killActive ? "var(--color-coral)" : "white",
                    border: killActive ? "1px solid var(--color-coral)" : "none",
                    animation: killAnimating ? "killFlash 0.5s ease-out" : undefined,
                    cursor: killActive ? "default" : "pointer",
                  }}
                >
                  {killActive ? (autoKilled ? "Auto-Killed" : "Agent Killed") : "Kill Agent"}
                </button>

                {/* Auto-kill violation chain */}
                {autoKilled && autoKillViolations.length > 0 && (
                  <div
                    className="rounded-lg p-3 text-xs"
                    style={{
                      backgroundColor: "rgba(239, 68, 68, 0.08)",
                      border: "1px solid rgba(255, 107, 74, 0.2)",
                    }}
                  >
                    <div className="font-semibold mb-2" style={{ color: "var(--color-coral)" }}>
                      Auto-killed after {autoKillViolations.length} violations:
                    </div>
                    {autoKillViolations.map((v, i) => (
                      <div key={i} className="flex items-center gap-2 py-0.5" style={{ color: "var(--color-text-secondary)" }}>
                        <span style={{ color: "var(--color-text-tertiary)" }}>{v.timestamp}</span>
                        <span style={{ color: "var(--color-coral)" }}>{v.ruleName}</span>
                        <span>blocked {v.action}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Rules */}
                <div className="rounded-lg" style={{ border: "1px solid var(--color-border)" }}>
                  <div className="flex items-center justify-between px-4 py-3 font-semibold text-sm" style={{ borderBottom: "1px solid var(--color-border)" }}>
                    <span>Rules</span>
                    <button
                      onClick={() => setShowAddRule(!showAddRule)}
                      className="text-xs font-medium px-2 py-1 rounded"
                      style={{ color: "var(--color-coral)" }}
                    >
                      + Add
                    </button>
                  </div>

                  {/* Add rule form */}
                  {showAddRule && (
                    <div className="p-3 flex flex-col gap-2" style={{ borderBottom: "1px solid var(--color-border)", backgroundColor: "var(--color-surface)" }}>
                      <input
                        type="text"
                        placeholder="Rule name"
                        value={newRule.name}
                        onChange={(e) => setNewRule((p) => ({ ...p, name: e.target.value }))}
                        className="w-full px-3 py-1.5 rounded text-xs"
                        style={{ backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
                      />
                      <select
                        value={newRule.type}
                        onChange={(e) => setNewRule((p) => ({ ...p, type: e.target.value as "keyword" | "threshold" | "rate" }))}
                        className="w-full px-3 py-1.5 rounded text-xs"
                        style={{ backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
                      >
                        <option value="keyword">Keyword</option>
                        <option value="threshold">Threshold</option>
                        <option value="rate">Rate</option>
                      </select>
                      {newRule.type === "keyword" && (
                        <input
                          type="text"
                          placeholder="Keywords (comma-separated)"
                          value={newRule.keywords}
                          onChange={(e) => setNewRule((p) => ({ ...p, keywords: e.target.value }))}
                          className="w-full px-3 py-1.5 rounded text-xs"
                          style={{ backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
                        />
                      )}
                      {newRule.type === "threshold" && (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Field (e.g. cost_usd)"
                            value={newRule.field}
                            onChange={(e) => setNewRule((p) => ({ ...p, field: e.target.value }))}
                            className="flex-1 px-3 py-1.5 rounded text-xs"
                            style={{ backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
                          />
                          <input
                            type="number"
                            placeholder="Max"
                            value={newRule.value}
                            onChange={(e) => setNewRule((p) => ({ ...p, value: e.target.value }))}
                            className="w-20 px-3 py-1.5 rounded text-xs"
                            style={{ backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
                          />
                        </div>
                      )}
                      {newRule.type === "rate" && (
                        <div className="flex gap-2">
                          <input
                            type="number"
                            placeholder="Max count"
                            value={newRule.maxCount}
                            onChange={(e) => setNewRule((p) => ({ ...p, maxCount: e.target.value }))}
                            className="flex-1 px-3 py-1.5 rounded text-xs"
                            style={{ backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
                          />
                          <input
                            type="number"
                            placeholder="Window (min)"
                            value={newRule.windowMinutes}
                            onChange={(e) => setNewRule((p) => ({ ...p, windowMinutes: e.target.value }))}
                            className="w-24 px-3 py-1.5 rounded text-xs"
                            style={{ backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
                          />
                        </div>
                      )}
                      <button
                        onClick={addRule}
                        className="w-full py-1.5 rounded text-xs font-medium text-white"
                        style={{ backgroundColor: "var(--color-coral)" }}
                      >
                        Add Rule
                      </button>
                    </div>
                  )}

                  <div className="divide-y" style={{ borderColor: "var(--color-border)" }}>
                    {rules.length === 0 && (
                      <div className="px-4 py-6 text-center text-xs" style={{ color: "var(--color-text-tertiary)" }}>
                        No rules set. Add one above.
                      </div>
                    )}
                    {rules.map((rule) => (
                      <div
                        key={rule.id}
                        className="flex items-start gap-3 px-4 py-3"
                        style={{ opacity: rule.enabled ? 1 : 0.5 }}
                      >
                        <button
                          onClick={() => toggleRule(rule.id)}
                          className="mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center"
                          style={{
                            borderColor: rule.enabled ? "var(--color-green)" : "var(--color-border)",
                            backgroundColor: rule.enabled ? "var(--color-green)" : "transparent",
                          }}
                        >
                          {rule.enabled && (
                            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </button>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium">{rule.name}</span>
                            <RuleTypeLabel type={rule.config.type} />
                          </div>
                          <div className="text-[10px] mt-0.5" style={{ color: "var(--color-text-tertiary)" }}>
                            {ruleDescription(rule.config)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
        @keyframes killFlash {
          0% { box-shadow: 0 0 0 0 rgba(255, 107, 74, 0.6); }
          50% { box-shadow: 0 0 40px 8px rgba(255, 107, 74, 0.3); }
          100% { box-shadow: 0 0 0 0 rgba(255, 107, 74, 0); }
        }
      `}</style>
    </div>
  );
}

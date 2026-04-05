"use client";

import { useState, useEffect, useRef } from "react";
import { LogoFull } from "@/components/logo";
import Link from "next/link";
import {
  generateEvent,
  generateAlertEvent,
  generateKillEvent,
  generateSeedEvents,
  DEMO_RULES,
  type DemoEvent,
} from "./demo-data";

// Inline stat card to avoid SSR issues with shared component
function DemoStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div
      className="p-4 rounded-lg text-center"
      style={{
        backgroundColor: "var(--color-surface)",
        border: "1px solid var(--color-border)",
      }}
    >
      <div className="text-2xl font-bold" style={{ color: color || "var(--color-text)" }}>
        {value}
      </div>
      <div className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>
        {label}
      </div>
    </div>
  );
}

const typeColors: Record<string, string> = {
  tool_use: "var(--color-sky)",
  llm_call: "var(--color-purple)",
  message_sent: "var(--color-green)",
  message_received: "var(--color-green)",
  agent_lifecycle: "var(--color-text-secondary)",
  subagent: "var(--color-yellow)",
};

type DemoTab = "dashboard" | "rules" | "kill";

export default function DemoPage() {
  const [events, setEvents] = useState<DemoEvent[]>([]);
  const [eventCount, setEventCount] = useState(0);
  const [spend, setSpend] = useState(0);
  const [alertCount, setAlertCount] = useState(0);
  const [killFired, setKillFired] = useState(false);
  const [activeTab, setActiveTab] = useState<DemoTab>("dashboard");
  const [killAnimating, setKillAnimating] = useState(false);
  const tickRef = useRef(0);
  const feedRef = useRef<HTMLDivElement>(null);

  // Seed initial events
  useEffect(() => {
    const seed = generateSeedEvents(8);
    setEvents(seed);
    setEventCount(seed.length);
    setSpend(seed.reduce((s, e) => s + ((e.metadata.cost_usd as number) || 0.001), 0));
  }, []);

  // Stream new events
  useEffect(() => {
    const interval = setInterval(() => {
      tickRef.current++;

      // Alert fires at tick 6 (~15s)
      if (tickRef.current === 6) {
        const alert = generateAlertEvent();
        setEvents((prev) => [alert, ...prev].slice(0, 50));
        setEventCount((c) => c + 1);
        setAlertCount((c) => c + 1);
        return;
      }

      // Kill switch at tick 10 (~25s)
      if (tickRef.current === 10 && !killFired) {
        const kill = generateKillEvent();
        setEvents((prev) => [kill, ...prev].slice(0, 50));
        setEventCount((c) => c + 1);
        setKillFired(true);
        setKillAnimating(true);
        setActiveTab("kill");
        setTimeout(() => setKillAnimating(false), 3000);
        return;
      }

      // Normal events
      const event = generateEvent();
      const cost = (event.metadata.cost_usd as number) || 0.001;
      setEvents((prev) => [event, ...prev].slice(0, 50));
      setEventCount((c) => c + 1);
      setSpend((s) => s + cost);
    }, 2500);

    return () => clearInterval(interval);
  }, [killFired]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--color-bg)" }}>
      {/* Demo banner */}
      <div
        className="text-center py-2.5 px-4 text-xs font-medium"
        style={{
          backgroundColor: "var(--color-coral-soft)",
          color: "var(--color-coral)",
          borderBottom: "1px solid rgba(255, 107, 74, 0.2)",
        }}
      >
        This is a live demo with simulated data.{" "}
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
        {/* Tab bar */}
        <div className="flex gap-1 mb-8">
          {(
            [
              { key: "dashboard", label: "Dashboard" },
              { key: "rules", label: "Rules" },
              { key: "kill", label: "Kill Switch" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: activeTab === tab.key ? "var(--color-surface)" : "transparent",
                color: activeTab === tab.key ? "var(--color-text)" : "var(--color-text-secondary)",
                border: activeTab === tab.key ? "1px solid var(--color-border)" : "1px solid transparent",
              }}
            >
              {tab.label}
              {tab.key === "kill" && killFired && (
                <span
                  className="ml-2 inline-flex items-center justify-center w-2 h-2 rounded-full"
                  style={{ backgroundColor: "var(--color-coral)" }}
                />
              )}
            </button>
          ))}
        </div>

        {/* ═══════════════ DASHBOARD TAB ═══════════════ */}
        {activeTab === "dashboard" && (
          <div>
            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <DemoStat label="Events" value={eventCount.toLocaleString()} />
              <DemoStat label="Agents Active" value="3" color="var(--color-green)" />
              <DemoStat label="Spend" value={`$${spend.toFixed(2)}`} />
              <DemoStat
                label="Alerts"
                value={alertCount.toString()}
                color={alertCount > 0 ? "var(--color-coral)" : "var(--color-text)"}
              />
            </div>

            {/* Activity feed */}
            <div
              className="rounded-lg overflow-hidden"
              style={{ border: "1px solid var(--color-border)" }}
              ref={feedRef}
            >
              <div
                className="flex items-center justify-between px-4 py-3 font-semibold text-sm"
                style={{ borderBottom: "1px solid var(--color-border)" }}
              >
                <span>Activity Feed</span>
                <span
                  className="relative flex h-2 w-2"
                  title="Live"
                >
                  <span
                    className="absolute inline-flex h-full w-full rounded-full opacity-75"
                    style={{
                      backgroundColor: "var(--color-green)",
                      animation: "ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite",
                    }}
                  />
                  <span
                    className="relative inline-flex rounded-full h-2 w-2"
                    style={{ backgroundColor: "var(--color-green)" }}
                  />
                </span>
              </div>
              <div className="divide-y" style={{ borderColor: "var(--color-border)" }}>
                {events.map((event, i) => (
                  <div
                    key={event.id}
                    className="flex items-center gap-3 px-4 py-2 text-xs transition-all"
                    style={{
                      backgroundColor:
                        event.severity_hint === "critical"
                          ? "rgba(239, 68, 68, 0.1)"
                          : event.severity_hint === "elevated"
                          ? "var(--color-coral-soft)"
                          : "transparent",
                      borderLeft:
                        event.severity_hint !== "normal"
                          ? "2px solid var(--color-coral)"
                          : "2px solid transparent",
                      animation: i === 0 ? "fadeIn 0.3s ease-out" : undefined,
                    }}
                  >
                    <span style={{ color: "var(--color-text-tertiary)", minWidth: "48px" }}>
                      {new Date(event.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span
                      className="font-medium"
                      style={{
                        color: typeColors[event.event_type] || "var(--color-text-secondary)",
                        minWidth: "60px",
                      }}
                    >
                      {event.event_type.replace("_", " ")}
                    </span>
                    <span
                      className="truncate"
                      style={{
                        color:
                          event.severity_hint !== "normal"
                            ? "var(--color-coral)"
                            : "var(--color-text-secondary)",
                      }}
                    >
                      {event.action}
                    </span>
                    <span
                      className="ml-auto text-[10px] shrink-0"
                      style={{ color: "var(--color-text-tertiary)" }}
                    >
                      {event.agent_name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════ RULES TAB ═══════════════ */}
        {activeTab === "rules" && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-bold mb-1">Rules</h2>
              <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                Pre-configured rules that evaluate every action before it executes.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              {DEMO_RULES.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center justify-between p-4 rounded-lg"
                  style={{
                    backgroundColor: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: rule.enabled ? "var(--color-green)" : "var(--color-text-tertiary)" }}
                    />
                    <div>
                      <div className="font-medium text-sm">{rule.name}</div>
                      <div className="text-xs mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
                        {rule.rule_type === "rate" &&
                          `Max ${rule.config.max_count} events in ${(rule.config.window_seconds as number) / 60} min`}
                        {rule.rule_type === "keyword" &&
                          `Blocks: ${(rule.config.keywords as string[]).join(", ")}`}
                        {rule.rule_type === "threshold" &&
                          `$${rule.config.threshold} spend limit per hour`}
                      </div>
                    </div>
                  </div>
                  <span
                    className="text-xs px-3 py-1 rounded-full font-medium"
                    style={{
                      backgroundColor: "rgba(74, 222, 128, 0.1)",
                      color: "var(--color-green)",
                      border: "1px solid rgba(74, 222, 128, 0.2)",
                    }}
                  >
                    Active
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══════════════ KILL SWITCH TAB ═══════════════ */}
        {activeTab === "kill" && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-bold mb-1">Kill Switch</h2>
              <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                Blocks dangerous actions in-process, before they execute. Zero latency.
              </p>
            </div>

            {killFired ? (
              <div
                className="rounded-xl p-8 text-center relative overflow-hidden"
                style={{
                  background: "linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(255, 107, 74, 0.05) 100%)",
                  border: "1px solid rgba(255, 107, 74, 0.3)",
                  animation: killAnimating ? "killFlash 0.5s ease-out" : undefined,
                }}
              >
                <div className="mb-4">
                  <svg
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--color-coral)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mx-auto"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-2" style={{ color: "var(--color-coral)" }}>
                  Action Blocked
                </h3>
                <p className="text-sm mb-6" style={{ color: "var(--color-text-secondary)" }}>
                  Clawnitor intercepted a destructive command before it could execute.
                </p>

                <div
                  className="inline-block px-6 py-4 rounded-xl text-left text-sm max-w-lg mx-auto"
                  style={{
                    backgroundColor: "var(--color-bg)",
                    border: "1px solid var(--color-border)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  <div style={{ color: "var(--color-text-tertiary)" }}>
                    {"// deploy-assistant tried to run:"}
                  </div>
                  <div style={{ color: "var(--color-text-secondary)" }}>
                    {'tool_call: bash("rm -rf /app/data")'}
                  </div>
                  <div style={{ color: "var(--color-coral)", marginTop: "8px", fontWeight: 600 }}>
                    {"BLOCKED by Clawnitor"}
                  </div>
                  <div style={{ color: "var(--color-text-secondary)" }}>
                    {'Rule matched: keyword "rm -rf"'}
                  </div>
                  <div style={{ color: "var(--color-text-secondary)" }}>
                    {"Action stopped before execution"}
                  </div>
                  <div style={{ color: "var(--color-green)", marginTop: "8px" }}>
                    {"Agent paused. Resume from dashboard when ready."}
                  </div>
                </div>

                <div className="mt-6">
                  <button
                    onClick={() => {
                      setKillFired(false);
                      setKillAnimating(false);
                      tickRef.current = 0;
                      setActiveTab("dashboard");
                    }}
                    className="px-4 py-2 rounded-lg text-sm font-medium"
                    style={{
                      backgroundColor: "var(--color-surface)",
                      border: "1px solid var(--color-border)",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    Reset Demo
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="rounded-xl p-12 text-center"
                style={{
                  backgroundColor: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <div className="mb-4">
                  <svg
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--color-green)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mx-auto"
                  >
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">Kill switch armed</h3>
                <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                  Watching all agent actions. A destructive command will be blocked shortly...
                </p>
                <div className="mt-4">
                  <span className="relative flex h-3 w-3 mx-auto">
                    <span
                      className="absolute inline-flex h-full w-full rounded-full opacity-75"
                      style={{
                        backgroundColor: "var(--color-green)",
                        animation: "ping 2s cubic-bezier(0, 0, 0.2, 1) infinite",
                      }}
                    />
                    <span
                      className="relative inline-flex rounded-full h-3 w-3"
                      style={{ backgroundColor: "var(--color-green)" }}
                    />
                  </span>
                </div>
              </div>
            )}
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

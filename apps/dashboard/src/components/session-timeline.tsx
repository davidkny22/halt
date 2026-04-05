"use client";

import { useState } from "react";

interface Session {
  id: string;
  agent_id: string;
  agent_name?: string | null;
  status: string;
  started_at: string;
  ended_at: string | null;
  duration_ms: number | null;
  event_count: number;
  total_cost: string | number;
  total_tokens: number;
  kill_reason: string | null;
  metadata: Record<string, any>;
}

interface SessionEvent {
  id: string;
  session_id: string;
  event_type: string;
  action: string;
  target: string;
  metadata: Record<string, any>;
  severity_hint: string;
  timestamp: string;
}

interface SubagentGroup {
  subagentId: string;
  events: SessionEvent[];
  spawningEvent?: SessionEvent;
  endedEvent?: SessionEvent;
}

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: "rgba(74, 222, 128, 0.1)", text: "var(--color-green)", label: "Active" },
  completed: { bg: "rgba(56, 189, 248, 0.1)", text: "var(--color-sky)", label: "Completed" },
  killed: { bg: "rgba(255, 107, 74, 0.1)", text: "var(--color-coral)", label: "Killed" },
};

const typeColors: Record<string, string> = {
  tool_use: "var(--color-sky)",
  llm_call: "var(--color-purple)",
  message_sent: "var(--color-green)",
  message_received: "var(--color-green)",
  agent_lifecycle: "var(--color-text-secondary)",
  subagent: "var(--color-yellow)",
};

const typeLabels: Record<string, string> = {
  tool_use: "Tool",
  llm_call: "LLM",
  message_sent: "Msg",
  message_received: "Msg",
  agent_lifecycle: "Lifecycle",
  subagent: "Subagent",
};

function formatDuration(ms: number | null): string {
  if (!ms) return "-";
  if (ms < 1000) return "<1s";
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function formatTime(ts: string): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatDate(ts: string): string {
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return "Today";
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Separate events into main agent events and subagent groups */
function groupEvents(events: SessionEvent[]): {
  mainEvents: SessionEvent[];
  subagentGroups: SubagentGroup[];
} {
  const mainEvents: SessionEvent[] = [];
  const subagentMap = new Map<string, SubagentGroup>();

  for (const event of events) {
    const subId = event.metadata?.subagent_id;

    if (subId) {
      if (!subagentMap.has(subId)) {
        subagentMap.set(subId, { subagentId: subId, events: [] });
      }
      const group = subagentMap.get(subId)!;

      // Track lifecycle events
      if (event.event_type === "subagent" && event.action.includes("spawning")) {
        group.spawningEvent = event;
        mainEvents.push(event); // Also show in main timeline as a marker
      } else if (event.event_type === "subagent" && event.action.includes("ended")) {
        group.endedEvent = event;
        mainEvents.push(event); // Also show in main timeline as a marker
      } else {
        group.events.push(event);
      }
    } else {
      mainEvents.push(event);
    }
  }

  return {
    mainEvents,
    subagentGroups: [...subagentMap.values()].filter((g) => g.events.length > 0),
  };
}

function EventRow({ event }: { event: SessionEvent }) {
  const color = typeColors[event.event_type] || "var(--color-text-secondary)";
  const isSevere = event.severity_hint !== "normal";
  const cost = event.metadata?.cost_usd;
  const isSubagentLifecycle = event.event_type === "subagent";

  return (
    <div className="relative flex items-start gap-3 pb-2" style={{ paddingLeft: isSubagentLifecycle ? "8px" : "0" }}>
      <div className="relative shrink-0 mt-1.5" style={{ zIndex: 1 }}>
        <div
          className="w-[9px] h-[9px] rounded-full border-2"
          style={{ borderColor: color, backgroundColor: isSevere ? color : "var(--color-bg)" }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className="text-[11px] font-medium px-1 py-0.5 rounded"
            style={{ backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`, color }}
          >
            {typeLabels[event.event_type] || event.event_type}
          </span>
          <span className="text-xs truncate" style={{ color: isSevere ? "var(--color-coral)" : "var(--color-text)" }}>
            {event.action}
          </span>
          {cost != null && cost > 0 && (
            <span className="text-[11px] ml-auto shrink-0" style={{ color: "var(--color-text-tertiary)" }}>
              ${cost.toFixed(4)}
            </span>
          )}
        </div>
        <span className="text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>
          {formatTime(event.timestamp)}
        </span>
      </div>
    </div>
  );
}

function SubagentSection({ group }: { group: SubagentGroup }) {
  const [expanded, setExpanded] = useState(false);
  const totalCost = group.events.reduce((s, e) => s + (e.metadata?.cost_usd || 0), 0);
  const duration = group.endedEvent?.metadata?.duration_ms;

  return (
    <div
      className="ml-4 my-2 rounded-lg overflow-hidden"
      style={{ border: "1px solid rgba(251, 191, 36, 0.2)", backgroundColor: "rgba(251, 191, 36, 0.03)" }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left"
      >
        <svg
          width="10" height="10" viewBox="0 0 24 24" fill="none"
          stroke="var(--color-yellow)" strokeWidth="2" className="shrink-0"
          style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s" }}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span
          className="text-[11px] font-medium px-1.5 py-0.5 rounded"
          style={{ backgroundColor: "rgba(251, 191, 36, 0.1)", color: "var(--color-yellow)" }}
        >
          Subagent
        </span>
        <code className="text-[11px]" style={{ color: "var(--color-yellow)", fontFamily: "var(--font-mono)" }}>
          {group.subagentId.length > 20 ? group.subagentId.slice(0, 20) + "..." : group.subagentId}
        </code>
        <span className="text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>
          {group.events.length} events
        </span>
        {duration && (
          <span className="text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>
            {formatDuration(duration)}
          </span>
        )}
        {totalCost > 0 && (
          <span className="text-[11px] ml-auto" style={{ color: "var(--color-coral)" }}>
            ${totalCost.toFixed(4)}
          </span>
        )}
      </button>

      {expanded && (
        <div className="px-3 pb-2">
          <div className="relative ml-3">
            <div className="absolute left-[4px] top-0 bottom-0 w-px" style={{ backgroundColor: "rgba(251, 191, 36, 0.2)" }} />
            {group.events.map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function SessionTimeline({ sessions, agentId }: { sessions: Session[]; agentId?: string }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [events, setEvents] = useState<Record<string, SessionEvent[]>>({});
  const [loadingEvents, setLoadingEvents] = useState<string | null>(null);

  if (sessions.length === 0) {
    return (
      <div
        className="rounded-lg p-6 text-center"
        style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
      >
        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
          No sessions yet. Events will appear here once this agent runs.
        </p>
      </div>
    );
  }

  const toggleSession = async (sessionId: string) => {
    if (expanded === sessionId) {
      setExpanded(null);
      return;
    }
    setExpanded(sessionId);

    if (!events[sessionId] && agentId) {
      setLoadingEvents(sessionId);
      try {
        const res = await fetch("/api/agents-action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "get-session-events", agentId, sessionId }),
        });
        if (res.ok) {
          const data = await res.json();
          setEvents((prev) => ({ ...prev, [sessionId]: data.events || [] }));
        }
      } catch {}
      setLoadingEvents(null);
    }
  };

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ border: "1px solid var(--color-border)" }}
    >
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ borderBottom: "1px solid var(--color-border)" }}
      >
        <span className="font-semibold text-sm">Sessions</span>
        <span className="text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>
          {sessions.length} sessions
        </span>
      </div>
      <div className="overflow-y-auto" style={{ maxHeight: "600px" }}>
        {sessions.map((session) => {
          const isExpanded = expanded === session.id;
          const status = statusColors[session.status] || statusColors.active;
          const cost = Number(session.total_cost) || 0;
          const sessionEvents = events[session.id] || [];
          const { mainEvents, subagentGroups } = groupEvents(sessionEvents);

          return (
            <div key={session.id}>
              {/* Session header */}
              <button
                onClick={() => toggleSession(session.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
                style={{
                  borderBottom: "1px solid var(--color-border)",
                  backgroundColor: isExpanded ? "var(--color-surface)" : "transparent",
                }}
              >
                <svg
                  width="12" height="12" viewBox="0 0 24 24" fill="none"
                  stroke="var(--color-text-tertiary)" strokeWidth="2" className="shrink-0"
                  style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s" }}
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>

                <span
                  className="text-[11px] font-medium px-1.5 py-0.5 rounded shrink-0"
                  style={{ backgroundColor: status.bg, color: status.text }}
                >
                  {status.label}
                </span>

                <div className="flex flex-col min-w-[90px]">
                  <span className="text-xs font-medium">{formatDate(session.started_at)}</span>
                  <span className="text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>
                    {formatTime(session.started_at)}
                  </span>
                </div>

                <span className="text-xs px-2 py-0.5 rounded shrink-0" style={{ backgroundColor: "var(--color-bg)", color: "var(--color-text-secondary)" }}>
                  {formatDuration(session.duration_ms)}
                </span>

                <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                  {session.event_count} events
                </span>

                {cost > 0 && (
                  <span className="text-xs font-medium ml-auto shrink-0" style={{ color: "var(--color-coral)" }}>
                    ${cost.toFixed(4)}
                  </span>
                )}

                {session.kill_reason && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--color-coral)" strokeWidth="2" className="shrink-0">
                    <circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                  </svg>
                )}
              </button>

              {/* Expanded: session detail */}
              {isExpanded && (
                <div className="px-4 py-3" style={{ backgroundColor: "var(--color-surface)" }}>
                  {/* Kill reason */}
                  {session.kill_reason && (
                    <div
                      className="text-xs px-3 py-2 rounded mb-3"
                      style={{ backgroundColor: "rgba(255, 107, 74, 0.08)", color: "var(--color-coral)", border: "1px solid rgba(255, 107, 74, 0.2)" }}
                    >
                      Killed: {session.kill_reason}
                    </div>
                  )}

                  {/* Session metadata */}
                  <div className="flex gap-4 mb-3 text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>
                    <span>{session.total_tokens.toLocaleString()} tokens</span>
                    {session.metadata?.plugin_version && <span>v{session.metadata.plugin_version}</span>}
                    <code style={{ fontFamily: "var(--font-mono)" }}>
                      {session.id.length > 24 ? session.id.slice(0, 24) + "..." : session.id}
                    </code>
                  </div>

                  {loadingEvents === session.id ? (
                    <div className="text-xs py-4 text-center" style={{ color: "var(--color-text-tertiary)" }}>
                      Loading events...
                    </div>
                  ) : sessionEvents.length === 0 ? (
                    <div className="text-xs py-4 text-center" style={{ color: "var(--color-text-tertiary)" }}>
                      No event details available
                    </div>
                  ) : (
                    <>
                      {/* Main agent events */}
                      <div className="relative ml-4 mb-2">
                        <div className="absolute left-[4px] top-0 bottom-0 w-px" style={{ backgroundColor: "var(--color-border)" }} />
                        {mainEvents.map((event) => (
                          <EventRow key={event.id} event={event} />
                        ))}
                      </div>

                      {/* Subagent sessions */}
                      {subagentGroups.length > 0 && (
                        <div className="mt-3">
                          <div className="text-[11px] font-medium mb-2" style={{ color: "var(--color-text-secondary)" }}>
                            Subagent Sessions ({subagentGroups.length})
                          </div>
                          {subagentGroups.map((group) => (
                            <SubagentSection key={group.subagentId} group={group} />
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

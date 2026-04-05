"use client";

import { useState } from "react";

interface Event {
  id: string;
  timestamp: string;
  event_type: string;
  action: string;
  target: string;
  severity_hint: string;
  metadata: Record<string, any>;
  agent_name?: string | null;
  session_id?: string;
}

const typeColors: Record<string, string> = {
  tool_use: "var(--color-sky)",
  llm_call: "var(--color-purple)",
  message_sent: "var(--color-green)",
  message_received: "var(--color-green)",
  agent_lifecycle: "var(--color-text-secondary)",
  subagent: "var(--color-yellow)",
};

const typeLabels: Record<string, string> = {
  tool_use: "tool",
  llm_call: "llm",
  message_sent: "msg out",
  message_received: "msg in",
  agent_lifecycle: "lifecycle",
  subagent: "subagent",
};

export function ActivityFeed({ events }: { events: Event[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [sessionFilter, setSessionFilter] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [showAll, setShowAll] = useState(false);

  // Time range filtering
  const timeRangeMs: Record<string, number> = {
    "1h": 60 * 60 * 1000,
    "6h": 6 * 60 * 60 * 1000,
    "24h": 24 * 60 * 60 * 1000,
    "7d": 7 * 24 * 60 * 60 * 1000,
  };

  const timeFiltered = timeRange === "all"
    ? events
    : events.filter((e) => Date.now() - new Date(e.timestamp).getTime() < (timeRangeMs[timeRange] || Infinity));

  // Get unique sessions for filtering
  const sessions = [...new Set(timeFiltered.map((e) => e.session_id).filter(Boolean))];
  const hasMultipleSessions = sessions.length > 1;

  // Filter by session if selected
  const sessionFiltered = sessionFilter
    ? timeFiltered.filter((e) => e.session_id === sessionFilter)
    : timeFiltered;

  // Sort
  const filtered = [...sessionFiltered].sort((a, b) => {
    if (sortBy === "newest") return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    if (sortBy === "oldest") return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    if (sortBy === "errors") {
      const aErr = (a.metadata?.blocked ? 2 : 0) + (a.metadata?.error ? 1 : 0) + (a.severity_hint !== "normal" ? 1 : 0);
      const bErr = (b.metadata?.blocked ? 2 : 0) + (b.metadata?.error ? 1 : 0) + (b.severity_hint !== "normal" ? 1 : 0);
      return bErr - aErr || new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    }
    if (sortBy === "cost") return (b.metadata?.cost_usd || 0) - (a.metadata?.cost_usd || 0);
    if (sortBy === "tool") return (a.metadata?.tool_name || "").localeCompare(b.metadata?.tool_name || "");
    return 0;
  });

  // Show first 20 or all
  const visible = showAll ? filtered : filtered.slice(0, 20);
  const hasMore = filtered.length > 20 && !showAll;

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ border: "1px solid var(--color-border)" }}
    >
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3"
        style={{ borderBottom: "1px solid var(--color-border)" }}
      >
        <span className="font-semibold text-sm">Activity Feed</span>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1">
            {[
              { value: "1h", label: "1h" },
              { value: "6h", label: "6h" },
              { value: "24h", label: "24h" },
              { value: "7d", label: "7d" },
              { value: "all", label: "All" },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => { setTimeRange(opt.value); setShowAll(false); }}
                className="text-[11px] px-1.5 py-0.5 rounded"
                style={{
                  backgroundColor: timeRange === opt.value ? "var(--color-surface)" : "transparent",
                  color: timeRange === opt.value ? "var(--color-text)" : "var(--color-text-tertiary)",
                  border: timeRange === opt.value ? "1px solid var(--color-border)" : "1px solid transparent",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="text-[11px] px-2 py-1 rounded"
            style={{
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text-secondary)",
            }}
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="errors">Errors first</option>
            <option value="cost">Highest cost</option>
            <option value="tool">By tool</option>
          </select>
          {hasMultipleSessions && (
            <select
              value={sessionFilter || ""}
              onChange={(e) => setSessionFilter(e.target.value || null)}
              className="text-[11px] px-2 py-1 rounded"
              style={{
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text-secondary)",
              }}
            >
              <option value="">All sessions</option>
              {sessions.map((s) => (
                <option key={s} value={s!}>
                  {s!.length > 20 ? s!.slice(0, 20) + "..." : s}
                </option>
              ))}
            </select>
          )}
          <span className="text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>
            {filtered.length} events
          </span>
        </div>
      </div>

      <div
        className="divide-y overflow-y-auto"
        style={{ borderColor: "var(--color-border)", maxHeight: "500px" }}
      >
        {visible.length === 0 ? (
          <div
            className="px-4 py-8 text-center text-sm"
            style={{ color: "var(--color-text-secondary)" }}
          >
            No events yet. Install the Clawnitor plugin to start monitoring.
          </div>
        ) : (
          visible.map((event) => {
            const isExpanded = expanded.has(event.id);
            const color = typeColors[event.event_type] || "var(--color-text-secondary)";
            const cost = event.metadata?.cost_usd;
            const subagentId = event.metadata?.subagent_id;
            const isBlocked = event.metadata?.blocked === true;
            const blockReason = event.metadata?.block_reason;
            const hasError = !!event.metadata?.error;
            const isShield = event.metadata?.shield_detection === true;

            return (
              <div key={event.id}>
                {/* Collapsed row */}
                <button
                  onClick={() => toggleExpand(event.id)}
                  className="w-full flex items-center gap-3 px-4 py-2 text-xs text-left"
                  style={{
                    backgroundColor:
                      isBlocked
                        ? "rgba(255, 107, 74, 0.08)"
                        : event.severity_hint === "elevated"
                        ? "var(--color-coral-soft)"
                        : event.severity_hint === "critical"
                        ? "rgba(239, 68, 68, 0.1)"
                        : hasError
                        ? "rgba(239, 68, 68, 0.05)"
                        : isExpanded
                        ? "var(--color-surface)"
                        : "transparent",
                    borderLeft:
                      isBlocked
                        ? "3px solid var(--color-coral)"
                        : event.severity_hint !== "normal"
                        ? "2px solid var(--color-coral)"
                        : hasError
                        ? "2px solid rgba(239, 68, 68, 0.5)"
                        : "2px solid transparent",
                  }}
                >
                  <span style={{ color: "var(--color-text-tertiary)", minWidth: "48px" }}>
                    {new Date(event.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span
                    className="text-[11px] font-medium px-1.5 py-0.5 rounded shrink-0"
                    style={{
                      backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`,
                      color,
                    }}
                  >
                    {typeLabels[event.event_type] || event.event_type}
                  </span>
                  {event.agent_name && (
                    <span
                      className="shrink-0 truncate max-w-[80px]"
                      style={{ color: "var(--color-text-tertiary)" }}
                      title={event.agent_name}
                    >
                      {event.agent_name}
                    </span>
                  )}
                  {isShield && (
                    <span
                      className="text-[11px] font-bold px-1.5 py-0.5 rounded shrink-0"
                      style={{ backgroundColor: "#FF6B4A", color: "white" }}
                    >
                      SHIELD
                    </span>
                  )}
                  {isBlocked && !isShield && (
                    <span
                      className="text-[11px] font-medium px-1.5 py-0.5 rounded shrink-0"
                      style={{ backgroundColor: "rgba(255, 107, 74, 0.15)", color: "var(--color-coral)" }}
                    >
                      BLOCKED
                    </span>
                  )}
                  {hasError && !isBlocked && (
                    <span
                      className="text-[11px] font-medium px-1.5 py-0.5 rounded shrink-0"
                      style={{ backgroundColor: "rgba(239, 68, 68, 0.1)", color: "#ef4444" }}
                    >
                      ERROR
                    </span>
                  )}
                  <span
                    className="truncate flex-1"
                    style={{
                      color: isBlocked
                        ? "var(--color-coral)"
                        : event.severity_hint !== "normal"
                        ? "var(--color-coral)"
                        : "var(--color-text)",
                      textDecoration: isBlocked ? "line-through" : "none",
                    }}
                  >
                    {event.action}
                  </span>
                  {cost != null && cost > 0 && (
                    <span
                      className="shrink-0"
                      style={{
                        color: cost > 1 ? "var(--color-coral)" : "var(--color-text-tertiary)",
                      }}
                    >
                      ${cost.toFixed(4)}
                    </span>
                  )}
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--color-text-tertiary)"
                    strokeWidth="2"
                    className="shrink-0"
                    style={{
                      transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.15s",
                    }}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div
                    className="px-4 py-3 text-xs"
                    style={{
                      backgroundColor: "var(--color-surface)",
                      borderTop: "1px solid var(--color-border)",
                    }}
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-[100px_1fr] gap-y-2 gap-x-3">
                      <span style={{ color: "var(--color-text-tertiary)" }}>Action</span>
                      <span className="break-all" style={{ color: "var(--color-text)" }}>
                        {event.action}
                      </span>

                      <span style={{ color: "var(--color-text-tertiary)" }}>Target</span>
                      <span className="break-all" style={{ color: "var(--color-text-secondary)" }}>
                        {event.target || "-"}
                      </span>

                      <span style={{ color: "var(--color-text-tertiary)" }}>Timestamp</span>
                      <span style={{ color: "var(--color-text-secondary)" }}>
                        {new Date(event.timestamp).toLocaleString()}
                      </span>

                      {event.agent_name && (
                        <>
                          <span style={{ color: "var(--color-text-tertiary)" }}>Agent</span>
                          <span style={{ color: "var(--color-text-secondary)" }}>
                            {event.agent_name}
                          </span>
                        </>
                      )}

                      {event.session_id && (
                        <>
                          <span style={{ color: "var(--color-text-tertiary)" }}>Session</span>
                          <code
                            className="text-[10px]"
                            style={{ color: "var(--color-text-tertiary)", fontFamily: "var(--font-mono)" }}
                          >
                            {event.session_id}
                          </code>
                        </>
                      )}

                      {subagentId && (
                        <>
                          <span style={{ color: "var(--color-text-tertiary)" }}>Subagent</span>
                          <code
                            className="text-[10px]"
                            style={{ color: "var(--color-yellow)", fontFamily: "var(--font-mono)" }}
                          >
                            {subagentId}
                          </code>
                        </>
                      )}

                      {event.metadata?.tool_name && (
                        <>
                          <span style={{ color: "var(--color-text-tertiary)" }}>Tool</span>
                          <span style={{ color: "var(--color-text-secondary)" }}>
                            {event.metadata.tool_name}
                          </span>
                        </>
                      )}

                      {event.metadata?.model && (
                        <>
                          <span style={{ color: "var(--color-text-tertiary)" }}>Model</span>
                          <code
                            className="text-[10px]"
                            style={{ color: "var(--color-purple)", fontFamily: "var(--font-mono)" }}
                          >
                            {event.metadata.model}
                          </code>
                        </>
                      )}

                      {cost != null && cost > 0 && (
                        <>
                          <span style={{ color: "var(--color-text-tertiary)" }}>Cost</span>
                          <span style={{ color: "var(--color-coral)" }}>
                            ${cost.toFixed(6)}
                          </span>
                        </>
                      )}

                      {event.metadata?.tokens_used != null && (
                        <>
                          <span style={{ color: "var(--color-text-tertiary)" }}>Tokens</span>
                          <span style={{ color: "var(--color-text-secondary)" }}>
                            {event.metadata.tokens_used.toLocaleString()}
                          </span>
                        </>
                      )}

                      {event.metadata?.duration_ms != null && (
                        <>
                          <span style={{ color: "var(--color-text-tertiary)" }}>Duration</span>
                          <span style={{ color: "var(--color-text-secondary)" }}>
                            {event.metadata.duration_ms.toFixed(0)}ms
                          </span>
                        </>
                      )}

                      {event.metadata?.blocked && (
                        <>
                          <span style={{ color: "var(--color-coral)" }}>Blocked</span>
                          <span className="break-all" style={{ color: "var(--color-coral)" }}>
                            {event.metadata.block_reason || "Action blocked by Clawnitor"}
                          </span>
                        </>
                      )}

                      {event.metadata?.shield_detection && (
                        <>
                          <span style={{ color: "#FF6B4A" }}>Shield</span>
                          <span style={{ color: "var(--color-text-secondary)" }}>
                            {event.metadata.shield_category} ({event.metadata.shield_severity})
                          </span>
                          {event.metadata.shield_patterns && (
                            <>
                              <span style={{ color: "var(--color-text-tertiary)" }}>Patterns</span>
                              <span style={{ color: "var(--color-text-secondary)" }}>
                                {event.metadata.shield_patterns.join(", ")}
                              </span>
                            </>
                          )}
                        </>
                      )}

                      {event.metadata?.block_source && (
                        <>
                          <span style={{ color: "var(--color-text-tertiary)" }}>Source</span>
                          <span style={{ color: "var(--color-text-secondary)" }}>
                            {event.metadata.block_source}
                          </span>
                        </>
                      )}

                      {event.metadata?.error && (
                        <>
                          <span style={{ color: "var(--color-coral)" }}>Error</span>
                          <span className="break-all" style={{ color: "var(--color-coral)" }}>
                            {event.metadata.error}
                          </span>
                        </>
                      )}

                      {event.metadata?.raw_snippet && (
                        <>
                          <span style={{ color: "var(--color-text-tertiary)" }}>Details</span>
                          <pre
                            className="text-[10px] p-2 rounded overflow-x-auto whitespace-pre-wrap break-all"
                            style={{
                              backgroundColor: "var(--color-bg)",
                              color: "var(--color-text-secondary)",
                              fontFamily: "var(--font-mono)",
                              maxHeight: "200px",
                            }}
                          >
                            {event.metadata.raw_snippet}
                          </pre>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Load more */}
      {hasMore && (
        <button
          onClick={() => setShowAll(true)}
          className="w-full px-4 py-2 text-xs font-medium"
          style={{
            borderTop: "1px solid var(--color-border)",
            color: "var(--color-coral)",
          }}
        >
          Show all {filtered.length} events
        </button>
      )}
    </div>
  );
}

interface Event {
  id: string;
  timestamp: string;
  event_type: string;
  action: string;
  severity_hint: string;
  metadata: Record<string, any>;
}

const typeColors: Record<string, string> = {
  tool_use: "var(--color-sky)",
  llm_call: "var(--color-purple)",
  message_sent: "var(--color-green)",
  message_received: "var(--color-green)",
  agent_lifecycle: "var(--color-text-secondary)",
  subagent: "var(--color-yellow)",
};

export function ActivityFeed({ events }: { events: Event[] }) {
  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ border: "1px solid var(--color-border)" }}
    >
      <div
        className="px-4 py-3 font-semibold text-sm"
        style={{ borderBottom: "1px solid var(--color-border)" }}
      >
        Activity Feed
      </div>
      <div className="divide-y" style={{ borderColor: "var(--color-border)" }}>
        {events.length === 0 ? (
          <div
            className="px-4 py-8 text-center text-sm"
            style={{ color: "var(--color-text-secondary)" }}
          >
            No events yet. Install the Clawnitor plugin to start monitoring.
          </div>
        ) : (
          events.map((event) => (
            <div
              key={event.id}
              className="flex items-center gap-3 px-4 py-2 text-xs"
              style={{
                backgroundColor:
                  event.severity_hint === "elevated"
                    ? "var(--color-coral-soft)"
                    : event.severity_hint === "critical"
                    ? "rgba(239, 68, 68, 0.1)"
                    : "transparent",
                borderLeft:
                  event.severity_hint !== "normal"
                    ? "2px solid var(--color-coral)"
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
                style={{
                  color: typeColors[event.event_type] || "var(--color-text-secondary)",
                  minWidth: "60px",
                }}
              >
                {event.event_type.replace("_", " ")}
              </span>
              <span
                style={{
                  color:
                    event.severity_hint !== "normal"
                      ? "var(--color-coral)"
                      : "var(--color-text-secondary)",
                }}
              >
                {event.action}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

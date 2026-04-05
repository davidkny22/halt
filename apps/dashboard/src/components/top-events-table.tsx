"use client";

import { useState } from "react";

interface CostlyEvent {
  id: string;
  event_type: string;
  action: string;
  target: string;
  cost: number;
  tokens: number;
  model: string | null;
  timestamp: string;
  agent_name: string | null;
}

type SortKey = "time" | "agent" | "action" | "model" | "tokens" | "cost";

export function TopEventsTable({ events }: { events: CostlyEvent[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("cost");
  const [sortAsc, setSortAsc] = useState(false);

  if (events.length === 0) return null;

  const sorted = [...events].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "time": cmp = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(); break;
      case "agent": cmp = (a.agent_name || "").localeCompare(b.agent_name || ""); break;
      case "action": cmp = a.action.localeCompare(b.action); break;
      case "model": cmp = (a.model || "").localeCompare(b.model || ""); break;
      case "tokens": cmp = (a.tokens || 0) - (b.tokens || 0); break;
      case "cost": cmp = (a.cost || 0) - (b.cost || 0); break;
    }
    return sortAsc ? cmp : -cmp;
  });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const SortHeader = ({ k, label, align }: { k: SortKey; label: string; align?: string }) => (
    <th
      className={`${align === "right" ? "text-right" : "text-left"} px-4 py-2 font-medium cursor-pointer select-none`}
      onClick={() => handleSort(k)}
      style={{ color: sortKey === k ? "var(--color-text)" : "var(--color-text-tertiary)" }}
    >
      {label} {sortKey === k && (sortAsc ? "↑" : "↓")}
    </th>
  );

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ border: "1px solid var(--color-border)" }}
    >
      <div
        className="px-4 py-3 font-semibold text-sm"
        style={{ borderBottom: "1px solid var(--color-border)" }}
      >
        Most Expensive Calls
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
              <SortHeader k="time" label="Time" />
              <SortHeader k="agent" label="Agent" />
              <SortHeader k="action" label="Action" />
              <SortHeader k="model" label="Model" />
              <SortHeader k="tokens" label="Tokens" align="right" />
              <SortHeader k="cost" label="Cost" align="right" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((event) => (
              <tr
                key={event.id}
                className="transition-colors"
                style={{ borderBottom: "1px solid var(--color-border)" }}
              >
                <td className="px-4 py-2 whitespace-nowrap" style={{ color: "var(--color-text-tertiary)" }}>
                  {new Date(event.timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" })}{" "}
                  {new Date(event.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </td>
                <td className="px-4 py-2 truncate max-w-[120px]" style={{ color: "var(--color-text-secondary)" }}>
                  {event.agent_name || "-"}
                </td>
                <td className="px-4 py-2">
                  <span className="truncate block max-w-[200px]" style={{ color: "var(--color-text)" }} title={event.action}>
                    {event.action}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <code className="text-[11px]" style={{ color: "var(--color-purple)", fontFamily: "var(--font-mono)" }}>
                    {event.model || "-"}
                  </code>
                </td>
                <td className="px-4 py-2 text-right whitespace-nowrap" style={{ color: "var(--color-text-tertiary)" }}>
                  {event.tokens?.toLocaleString() || "-"}
                </td>
                <td className="px-4 py-2 text-right whitespace-nowrap font-medium" style={{ color: event.cost > 1 ? "var(--color-coral)" : "var(--color-text)" }}>
                  ${event.cost?.toFixed(4) || "0.0000"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

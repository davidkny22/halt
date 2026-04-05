"use client";

interface ToolCost {
  tool_name: string;
  cost: number;
  tokens: number;
  event_count: number;
}

export function ToolCostCards({ tools }: { tools: ToolCost[] }) {
  if (tools.length === 0) return null;

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ border: "1px solid var(--color-border)" }}
    >
      <div
        className="px-4 py-3 font-semibold text-sm"
        style={{ borderBottom: "1px solid var(--color-border)" }}
      >
        Cost by Tool
      </div>
      <div className="p-3 flex flex-col gap-2">
        {tools.map((tool) => (
          <div
            key={tool.tool_name}
            className="flex items-center justify-between px-3 py-2 rounded"
            style={{
              backgroundColor: "var(--color-surface)",
            }}
          >
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate">{tool.tool_name || "unknown"}</div>
              <div className="text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>
                {tool.event_count} calls
              </div>
            </div>
            <div className="text-xs font-medium shrink-0" style={{ color: "var(--color-coral)" }}>
              ${tool.cost.toFixed(4)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

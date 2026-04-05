"use client";

interface ModelCost {
  model: string;
  cost: number;
  tokens: number;
  event_count: number;
}

export function ModelCostCards({ models }: { models: ModelCost[] }) {
  if (models.length === 0) return null;

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ border: "1px solid var(--color-border)" }}
    >
      <div
        className="px-4 py-3 font-semibold text-sm"
        style={{ borderBottom: "1px solid var(--color-border)" }}
      >
        Cost by Model
      </div>
      <div className="p-3 flex flex-col gap-2">
        {models.map((model) => (
          <div
            key={model.model}
            className="flex items-center justify-between px-3 py-2 rounded"
            style={{ backgroundColor: "var(--color-surface)" }}
          >
            <div className="flex-1 min-w-0">
              <code className="text-xs font-medium truncate block" style={{ color: "var(--color-purple)", fontFamily: "var(--font-mono)" }}>
                {model.model || "unknown"}
              </code>
              <div className="flex gap-3 mt-0.5">
                <span className="text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>
                  {model.tokens.toLocaleString()} tokens
                </span>
                <span className="text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>
                  {model.event_count} calls
                </span>
              </div>
            </div>
            <div className="text-xs font-medium shrink-0" style={{ color: "var(--color-coral)" }}>
              ${model.cost.toFixed(4)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

interface DailyData {
  day: string;
  spend: number;
  events: number;
}

export function SpendChart({ data }: { data: DailyData[] }) {
  if (data.length === 0) return null;

  const maxSpend = Math.max(...data.map((d) => d.spend), 0.01);
  const width = 600;
  const height = 160;
  const padding = { top: 10, right: 10, bottom: 24, left: 10 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // Generate points
  const points = data.map((d, i) => ({
    x: padding.left + (i / Math.max(data.length - 1, 1)) * chartW,
    y: padding.top + chartH - (d.spend / maxSpend) * chartH,
    ...d,
  }));

  // SVG path
  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  // Area fill path
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`;

  return (
    <div
      className="rounded-lg p-4"
      style={{
        backgroundColor: "var(--color-surface)",
        border: "1px solid var(--color-border)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold">7-Day Spend</span>
        <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
          ${data.reduce((s, d) => s + d.spend, 0).toFixed(2)} total
        </span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ height: "auto", maxHeight: "160px" }}
      >
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct) => (
          <line
            key={pct}
            x1={padding.left}
            y1={padding.top + chartH * (1 - pct)}
            x2={padding.left + chartW}
            y2={padding.top + chartH * (1 - pct)}
            stroke="var(--color-border)"
            strokeWidth="0.5"
          />
        ))}

        {/* Area fill */}
        <path
          d={areaPath}
          fill="url(#spendGradient)"
          opacity="0.3"
        />

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke="var(--color-coral)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Dots */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="3"
            fill="var(--color-coral)"
          />
        ))}

        {/* Day labels */}
        {points.map((p, i) => (
          <text
            key={i}
            x={p.x}
            y={height - 4}
            textAnchor="middle"
            fill="var(--color-text-tertiary)"
            fontSize="10"
            fontFamily="var(--font-sans)"
          >
            {new Date(p.day).toLocaleDateString(undefined, { weekday: "short" })}
          </text>
        ))}

        <defs>
          <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-coral)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="var(--color-coral)" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

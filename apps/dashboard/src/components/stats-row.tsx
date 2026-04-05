interface Stat {
  label: string;
  value: string | number;
  color?: string;
}

export function StatsRow({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="p-4 rounded-lg text-center"
          style={{
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-border)",
          }}
        >
          <div
            className="text-2xl font-bold"
            style={{ color: stat.color || "var(--color-text)" }}
          >
            {stat.value}
          </div>
          <div
            className="text-xs mt-1"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  );
}

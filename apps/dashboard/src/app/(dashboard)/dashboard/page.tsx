import { ActivityFeed } from "@/components/activity-feed";
import { SpendChart } from "@/components/spend-chart";
import { AgentCostCards } from "@/components/agent-cost-cards";
import { TopEventsTable } from "@/components/top-events-table";
import { ToolCostCards } from "@/components/tool-cost-cards";
import { ModelCostCards } from "@/components/model-cost-cards";
import { CopyBlock } from "@/components/copy-block";
import { getUserInfo, getStats, getEvents, getSavesCount, getSpend } from "@/lib/server-api";
import { UpgradeGate } from "@/components/upgrade-gate";
import Link from "next/link";

function TrendArrow({ trend }: { trend: number }) {
  if (trend === 0) return null;
  const up = trend > 0;
  return (
    <span
      className="text-[11px] font-medium ml-1"
      style={{ color: up ? "var(--color-coral)" : "var(--color-green)" }}
    >
      {up ? "\u2191" : "\u2193"}{Math.abs(trend)}%
    </span>
  );
}

export default async function DashboardPage() {
  const [user, stats, eventsData, savesData, spendData] = await Promise.all([
    getUserInfo(),
    getStats(),
    getEvents(100),
    getSavesCount(),
    getSpend(7),
  ]);

  const savesCount = savesData?.count ?? 0;
  const lastEventAt = (stats as any)?.last_event_at;
  const spendTrend = (stats as any)?.spend_trend ?? 0;
  const dailySpend = (stats as any)?.daily_spend ?? [];
  const shieldBlocks = (stats as any)?.shield_blocks_today ?? 0;
  const hasEvents = eventsData?.events && eventsData.events.length > 0;
  const byAgent = spendData?.by_agent ?? [];
  const byModel = spendData?.by_model ?? [];
  const byTool = spendData?.by_tool ?? [];
  const topEvents = spendData?.top_events ?? [];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {/* Saves banner */}
      {savesCount > 0 && (
        <Link
          href="/saves"
          className="flex items-center gap-3 p-4 rounded-xl mb-6 transition-colors hover:opacity-90"
          style={{
            background: "linear-gradient(135deg, rgba(74, 222, 128, 0.08) 0%, rgba(74, 222, 128, 0.02) 100%)",
            border: "1px solid rgba(74, 222, 128, 0.2)",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          <span className="text-sm font-medium" style={{ color: "var(--color-green)" }}>
            Halt has blocked {savesCount} harmful {savesCount === 1 ? "action" : "actions"}
          </span>
          <span className="ml-auto text-xs" style={{ color: "var(--color-text-tertiary)" }}>
            View all
          </span>
        </Link>
      )}

      {/* Stats row with trend arrows */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4 mb-6">
        {[
          { label: "Events Today", value: stats?.events_today ?? 0 },
          {
            label: "Agents Active",
            value: stats?.agents_active ?? 0,
            color: (stats?.agents_active ?? 0) > 0 ? "var(--color-green)" : undefined,
          },
          {
            label: "Spend Today",
            value: `$${(stats?.spend_today ?? 0).toFixed(2)}`,
            trend: spendTrend,
          },
          {
            label: "Alerts Today",
            value: stats?.alerts_today ?? 0,
            color: (stats?.alerts_today ?? 0) > 0 ? "var(--color-yellow)" : undefined,
          },
          {
            label: "Errors Today",
            value: (stats as any)?.errors_today ?? 0,
            color: ((stats as any)?.errors_today ?? 0) > 0 ? "var(--color-coral)" : undefined,
          },
          ...(shieldBlocks > 0 ? [{
            label: "Threats Blocked",
            value: shieldBlocks,
            color: "#FF6B4A",
          }] : []),
        ].map((stat) => (
          <div
            key={stat.label}
            className="p-4 rounded-lg text-center"
            style={{
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)",
            }}
          >
            <div className="text-2xl font-bold" style={{ color: stat.color || "var(--color-text)" }}>
              {stat.value}
              {"trend" in stat && stat.trend !== undefined && <TrendArrow trend={stat.trend} />}
            </div>
            <div className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {!user?.has_key ? (
        <div
          className="rounded-lg p-8 text-center"
          style={{ border: "1px solid var(--color-border)" }}
        >
          <h2 className="text-lg font-semibold mb-2">Welcome to Halt!</h2>
          <p className="text-sm mb-6" style={{ color: "var(--color-text-secondary)" }}>
            Two commands to start monitoring your OpenClaw agents.
          </p>
          <div className="max-w-md mx-auto flex flex-col gap-3">
            <CopyBlock text="openclaw plugins install @halt/plugin" />
            <CopyBlock text="npx halt init" />
          </div>
          <p className="text-xs mt-4" style={{ color: "var(--color-text-tertiary)" }}>
            <code style={{ fontFamily: "var(--font-mono)" }}>halt init</code> handles authentication and API key setup.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Activity feed — spans 2 columns */}
          <div className="lg:col-span-2">
            {hasEvents ? (
              <ActivityFeed events={eventsData!.events} />
            ) : (
              /* Quiet state */
              <div
                className="rounded-lg p-8 text-center"
                style={{
                  backgroundColor: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <div className="flex justify-center mb-4">
                  <span className="relative flex h-3 w-3">
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
                <p className="text-sm font-medium mb-1">All agents running normally</p>
                <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                  {lastEventAt
                    ? `Last event: ${formatTimeAgo(lastEventAt)}`
                    : "Events will appear here once your agent starts running."}
                </p>
                {user.key_prefix && (
                  <p className="text-xs mt-3" style={{ color: "var(--color-text-tertiary)" }}>
                    API key: <code style={{ fontFamily: "var(--font-mono)", color: "var(--color-coral)" }}>{user.key_prefix}........</code>
                  </p>
                )}
              </div>
            )}

            {/* Top costly events — below feed, same column */}
            {topEvents.length > 0 && (
              <div className="mt-6">
                <TopEventsTable events={topEvents} />
              </div>
            )}
          </div>

          {/* Cost sidebar — right column (Pro+) */}
          <div className="flex flex-col gap-6">
            <UpgradeGate
              feature="Cost Analytics"
              description="Unlock spend trends, per-agent costs, model breakdowns, and top expensive events with Pro."
              tier={(user as any)?.tier}
            >
              {dailySpend.length > 0 ? (
                <SpendChart data={dailySpend} />
              ) : (
                <div
                  className="rounded-lg p-4 text-center"
                  style={{
                    backgroundColor: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <span className="text-sm font-semibold block mb-2">7-Day Spend</span>
                  <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                    No spend data yet
                  </span>
                </div>
              )}
              {byAgent.length > 0 && <AgentCostCards agents={byAgent} />}
              {byModel.length > 0 && <ModelCostCards models={byModel} />}
              {byTool.length > 0 && <ToolCostCards tools={byTool} />}
            </UpgradeGate>
          </div>
        </div>
      )}

      <style>{`
        @keyframes ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

function formatTimeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

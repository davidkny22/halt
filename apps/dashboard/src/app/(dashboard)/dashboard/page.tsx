import { StatsRow } from "@/components/stats-row";
import { ActivityFeed } from "@/components/activity-feed";
import { getUserInfo } from "@/lib/server-api";

export default async function DashboardPage() {
  const user = await getUserInfo();

  const stats = [
    { label: "Events Today", value: 0 },
    {
      label: "Status",
      value: user ? "Connected" : "Set up required",
      color: user ? "var(--color-green)" : "var(--color-yellow)",
    },
    {
      label: "Tier",
      value: user
        ? user.tier.charAt(0).toUpperCase() + user.tier.slice(1)
        : "Free",
    },
    { label: "Alerts Today", value: 0 },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <StatsRow stats={stats} />

      {!user?.has_key ? (
        <div
          className="rounded-lg p-8 text-center"
          style={{ border: "1px solid var(--color-border)" }}
        >
          <h2 className="text-lg font-semibold mb-2">
            Welcome to Clawnitor!
          </h2>
          <p
            className="text-sm mb-6"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Install the plugin to start monitoring your OpenClaw agents.
          </p>
          <div
            className="inline-block px-4 py-3 rounded-lg text-sm text-left"
            style={{
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              fontFamily: "var(--font-mono)",
            }}
          >
            <div style={{ color: "var(--color-coral)" }}>
              $ openclaw plugins install @clawnitor/plugin
            </div>
          </div>
          {user?.key_prefix && (
            <p
              className="mt-4 text-xs"
              style={{ color: "var(--color-text-secondary)" }}
            >
              API key: <code style={{ color: "var(--color-coral)" }}>{user.key_prefix}••••••••</code>
            </p>
          )}
        </div>
      ) : (
        <div>
          <div
            className="rounded-lg p-6 mb-4 text-sm"
            style={{
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text-secondary)",
            }}
          >
            <p>
              Plugin connected. API key: <code style={{ color: "var(--color-coral)", fontFamily: "var(--font-mono)" }}>{user.key_prefix}••••••••</code>
            </p>
            <p className="mt-2">Events will appear here once your agent starts running.</p>
          </div>
          <ActivityFeed events={[]} />
        </div>
      )}
    </div>
  );
}

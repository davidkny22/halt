const mockAlerts = [
  {
    id: "1",
    severity: "elevated",
    message: 'Rule "Email flood" triggered: 23 events in 10min (max: 20)',
    created_at: new Date().toISOString(),
    delivered_channels: ["email"],
  },
];

export default function AlertsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Alert History</h1>

      <div
        className="rounded-lg overflow-hidden"
        style={{ border: "1px solid var(--color-border)" }}
      >
        {mockAlerts.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm" style={{ color: "var(--color-text-secondary)" }}>
            No alerts fired yet. Create rules to start monitoring.
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--color-border)" }}>
            {mockAlerts.map((alert) => (
              <div key={alert.id} className="px-4 py-4 flex items-start gap-4">
                <span
                  className="px-2 py-1 rounded text-xs font-medium mt-0.5"
                  style={{
                    backgroundColor: alert.severity === "critical"
                      ? "rgba(239, 68, 68, 0.15)"
                      : "var(--color-coral-soft)",
                    color: alert.severity === "critical"
                      ? "var(--color-red)"
                      : "var(--color-coral)",
                  }}
                >
                  {alert.severity.toUpperCase()}
                </span>
                <div className="flex-1">
                  <p className="text-sm">{alert.message}</p>
                  <p className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>
                    {new Date(alert.created_at).toLocaleString()} — Delivered via{" "}
                    {alert.delivered_channels?.join(", ") || "pending"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

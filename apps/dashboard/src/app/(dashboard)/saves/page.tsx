import { getSaves, getSavesCount } from "@/lib/server-api";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function SavesPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const [savesData, countData] = await Promise.all([
    getSaves(50),
    getSavesCount(),
  ]);

  const saves = savesData?.saves ?? [];
  const count = countData?.count ?? 0;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Saves</h1>
        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
          Every time Clawnitor blocked a harmful action to protect your agents.
        </p>
      </div>

      {/* Summary */}
      <div
        className="flex items-center gap-4 p-5 rounded-xl mb-8"
        style={{
          background: "linear-gradient(135deg, rgba(74, 222, 128, 0.08) 0%, rgba(74, 222, 128, 0.02) 100%)",
          border: "1px solid rgba(74, 222, 128, 0.2)",
        }}
      >
        <div
          className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: "rgba(74, 222, 128, 0.15)" }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </div>
        <div>
          <div className="text-2xl font-bold" style={{ color: "var(--color-green)" }}>
            {count} {count === 1 ? "save" : "saves"}
          </div>
          <div className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
            Clawnitor has blocked {count} harmful {count === 1 ? "action" : "actions"}
          </div>
        </div>
      </div>

      {/* Saves list */}
      {saves.length === 0 ? (
        <div
          className="text-center py-16 rounded-xl"
          style={{
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-border)",
          }}
        >
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          <p className="text-sm font-medium mb-1">No saves yet</p>
          <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
            When Clawnitor blocks a harmful action, it will appear here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {saves.map((save: any) => (
            <div
              key={save.id}
              className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg"
              style={{
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-border)",
              }}
            >
              <div
                className="w-8 h-8 rounded-md flex items-center justify-center shrink-0 mt-0.5"
                style={{
                  backgroundColor: save.source === "manual-kill"
                    ? "rgba(255, 107, 74, 0.15)"
                    : "rgba(239, 68, 68, 0.15)",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={save.source === "manual-kill" ? "var(--color-coral)" : "#ef4444"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm mb-1">{save.action_blocked}</div>
                {save.potential_impact && (
                  <div className="text-xs mb-2" style={{ color: "var(--color-text-secondary)" }}>
                    {save.potential_impact}
                  </div>
                )}
                <div className="flex items-center gap-3 text-xs flex-wrap" style={{ color: "var(--color-text-tertiary)" }}>
                  <span>
                    {new Date(save.created_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span
                    className="px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: save.source === "manual-kill" ? "var(--color-coral-soft)" : "rgba(239, 68, 68, 0.1)",
                      color: save.source === "manual-kill" ? "var(--color-coral)" : "#ef4444",
                    }}
                  >
                    {save.source === "manual-kill" ? "Manual kill" : "Auto-kill"}
                  </span>
                  {save.agent_name && (
                    <span style={{ color: "var(--color-sky)" }}>
                      {save.agent_name}
                    </span>
                  )}
                  {save.rule_name && (
                    <span style={{ color: "var(--color-purple)" }}>
                      Rule: {save.rule_name}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

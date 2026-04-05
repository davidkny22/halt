import { getUserInfo } from "@/lib/server-api";

export default async function RulesPage() {
  const user = await getUserInfo();
  const rules: any[] = [];
  const maxRules = user?.tier === "free" ? 3 : Infinity;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Rules</h1>
        <button
          className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ backgroundColor: "var(--color-coral)" }}
        >
          + Create Rule
        </button>
      </div>

      {user?.tier === "free" && (
        <div
          className="p-4 rounded-lg mb-6 text-sm"
          style={{
            backgroundColor: "var(--color-coral-soft)",
            border: "1px solid rgba(255, 107, 74, 0.2)",
            color: "var(--color-coral)",
          }}
        >
          {rules.length} of {maxRules} rules used —{" "}
          <strong>Upgrade to Pro</strong> for unlimited rules + natural language rules
        </div>
      )}

      {rules.length === 0 ? (
        <div
          className="rounded-lg p-8 text-center"
          style={{ border: "1px solid var(--color-border)" }}
        >
          <h2 className="text-lg font-semibold mb-2">No rules yet</h2>
          <p className="text-sm mb-4" style={{ color: "var(--color-text-secondary)" }}>
            Create your first rule to start getting alerts when your agents do something unexpected.
          </p>
          <p className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
            Rule types: threshold (spend limits), rate (email flooding), keyword (dangerous commands)
          </p>
        </div>
      ) : (
        <div
          className="rounded-lg overflow-hidden"
          style={{ border: "1px solid var(--color-border)" }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                <th className="text-left px-4 py-3 font-medium" style={{ color: "var(--color-text-secondary)" }}>Name</th>
                <th className="text-left px-4 py-3 font-medium" style={{ color: "var(--color-text-secondary)" }}>Type</th>
                <th className="text-left px-4 py-3 font-medium" style={{ color: "var(--color-text-secondary)" }}>Status</th>
                <th className="text-right px-4 py-3 font-medium" style={{ color: "var(--color-text-secondary)" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule: any) => (
                <tr key={rule.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <td className="px-4 py-3 font-medium">{rule.name}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded text-xs" style={{ backgroundColor: "var(--color-surface)", color: "var(--color-text-secondary)" }}>
                      {rule.rule_type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span style={{ color: rule.enabled ? "var(--color-green)" : "var(--color-text-secondary)" }}>
                      {rule.enabled ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button className="text-xs px-3 py-1 rounded" style={{ color: "var(--color-text-secondary)" }}>Edit</button>
                    <button className="text-xs px-3 py-1 rounded ml-2" style={{ color: "var(--color-red)" }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

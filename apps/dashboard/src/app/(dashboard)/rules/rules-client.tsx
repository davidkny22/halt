"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreateRuleModal } from "@/components/create-rule-modal";
import { TemplateLibrary } from "@/components/template-library";

const typeColors: Record<string, string> = {
  threshold: "var(--color-coral)",
  rate: "var(--color-sky)",
  keyword: "var(--color-purple)",
  nl: "var(--color-green)",
  injection: "#FF6B4A",
};

function formatRuleConfig(type: string, config: any): string {
  if (!config) return "";
  if (type === "threshold") return `${config.field || "cost_usd"} ${config.operator === "lt" ? "<" : ">"} ${config.value} over ${config.windowMinutes}min`;
  if (type === "rate") return `Max ${config.maxCount} ${config.eventType ? config.eventType.replace("_", " ") + "s" : "events"} per ${config.windowMinutes}min${config.toolName ? ` (${config.toolName})` : ""}`;
  if (type === "keyword") return `Blocks: ${(config.keywords || []).join(", ")}`;
  if (type === "nl") return config.promptText?.slice(0, 80) + (config.promptText?.length > 80 ? "..." : "");
  return "";
}

export function RulesClient({ rules, tier }: { rules: any[]; tier: string }) {
  const [showCreate, setShowCreate] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const router = useRouter();

  const maxRules = tier === "free" ? 3 : Infinity;

  async function handleDelete(ruleId: string) {
    if (!confirm("Delete this rule?")) return;
    setDeleting(ruleId);
    try {
      await fetch("/api/rules-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", ruleId }),
      });
      router.refresh();
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Rules</h1>
        <button
          onClick={() => setShowCreate(true)}
          disabled={rules.length >= maxRules}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-white cursor-pointer disabled:opacity-50"
          style={{ backgroundColor: "var(--color-coral)" }}
        >
          + Create Rule
        </button>
      </div>

      {tier === "free" && (
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
          className="rounded-lg p-8 text-center mb-8"
          style={{ border: "1px solid var(--color-border)" }}
        >
          <h2 className="text-lg font-semibold mb-2">No rules yet</h2>
          <p className="text-sm mb-4" style={{ color: "var(--color-text-secondary)" }}>
            Create your first rule or pick from the templates below.
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
                  <td className="px-4 py-3">
                    <div className="font-medium flex items-center gap-2">
                      {rule.rule_type === "injection" && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FF6B4A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                      )}
                      {rule.name}
                      {rule.rule_type === "injection" && rule.config?.shield_tier && (
                        <span
                          className="text-[10px] font-bold px-1 py-0.5 rounded"
                          style={{
                            backgroundColor: rule.config.shield_tier === "critical" ? "rgba(239, 68, 68, 0.15)" : rule.config.shield_tier === "high" ? "rgba(255, 107, 74, 0.15)" : "rgba(251, 191, 36, 0.15)",
                            color: rule.config.shield_tier === "critical" ? "#ef4444" : rule.config.shield_tier === "high" ? "#FF6B4A" : "#f59e0b",
                          }}
                        >
                          {rule.config.shield_tier.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] mt-0.5" style={{ color: "var(--color-text-tertiary)" }}>
                      {rule.rule_type === "injection"
                        ? `Powered by Clawnitor Shield — ${(rule.config?.categories || []).join(", ")}`
                        : formatRuleConfig(rule.rule_type, rule.config)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="px-2 py-1 rounded text-xs font-medium"
                      style={{
                        backgroundColor: rule.rule_type === "injection" ? "rgba(255, 107, 74, 0.1)" : "var(--color-surface)",
                        color: rule.rule_type === "injection" ? "#FF6B4A" : (typeColors[rule.rule_type] || "var(--color-text-secondary)"),
                      }}
                    >
                      {rule.rule_type === "injection" ? "shield" : rule.rule_type === "nl" ? "natural language" : rule.rule_type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span style={{ color: rule.enabled ? "var(--color-green)" : "var(--color-text-secondary)" }}>
                        {rule.enabled ? "Active" : "Disabled"}
                      </span>
                      {rule.enabled && (
                        <span
                          className="text-[11px] px-1.5 py-0.5 rounded"
                          style={{
                            backgroundColor: "var(--color-surface)",
                            color: rule.action_mode === "block" ? "var(--color-coral)"
                              : rule.action_mode === "alert" ? "var(--color-sky)"
                              : "var(--color-text-tertiary)",
                          }}
                        >
                          {rule.action_mode === "block" ? "Block" : rule.action_mode === "alert" ? "Alert" : "Block + Alert"}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(rule.id)}
                      disabled={deleting === rule.id}
                      className="text-xs px-3 py-1 rounded cursor-pointer disabled:opacity-50"
                      style={{ color: "var(--color-red)" }}
                    >
                      {deleting === rule.id ? "..." : "Delete"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <TemplateLibrary defaultExpanded={rules.length === 0} />

      {showCreate && (
        <CreateRuleModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

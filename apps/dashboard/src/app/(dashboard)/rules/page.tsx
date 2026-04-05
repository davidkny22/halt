"use client";

import { useState } from "react";

const mockRules = [
  { id: "1", name: "High spend alert", rule_type: "threshold", enabled: true, created_at: "2026-03-14" },
  { id: "2", name: "Production deploy", rule_type: "keyword", enabled: true, created_at: "2026-03-14" },
  { id: "3", name: "Email flood", rule_type: "rate", enabled: true, created_at: "2026-03-14" },
];

export default function RulesPage() {
  const [rules] = useState(mockRules);

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

      {/* Free tier banner */}
      <div
        className="p-4 rounded-lg mb-6 text-sm"
        style={{
          backgroundColor: "var(--color-coral-soft)",
          border: "1px solid var(--color-coral)",
          color: "var(--color-coral)",
        }}
      >
        3 of 3 rules used — <strong>Upgrade to Pro</strong> for unlimited rules + AI-powered natural language rules
      </div>

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
            {rules.map((rule) => (
              <tr key={rule.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                <td className="px-4 py-3 font-medium">{rule.name}</td>
                <td className="px-4 py-3">
                  <span
                    className="px-2 py-1 rounded text-xs"
                    style={{
                      backgroundColor: "var(--color-surface)",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {rule.rule_type}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span style={{ color: rule.enabled ? "var(--color-green)" : "var(--color-text-secondary)" }}>
                    {rule.enabled ? "Active" : "Disabled"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button className="text-xs px-3 py-1 rounded" style={{ color: "var(--color-text-secondary)" }}>
                    Edit
                  </button>
                  <button className="text-xs px-3 py-1 rounded ml-2" style={{ color: "var(--color-red)" }}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

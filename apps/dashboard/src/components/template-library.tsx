"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface RuleTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  severity: string;
  rule_type: string;
  config: any;
  agent_visible: boolean;
}

const CATEGORIES = ["security", "safety", "cost", "communication", "compliance"];

const CATEGORY_LABELS: Record<string, string> = {
  security: "Shield",
  safety: "Safety",
  cost: "Cost Control",
  communication: "Communication",
  compliance: "Compliance",
};

const SEVERITY_COLORS: Record<string, { bg: string; text: string }> = {
  critical: { bg: "rgba(239, 68, 68, 0.15)", text: "#ef4444" },
  high: { bg: "rgba(255, 107, 74, 0.15)", text: "var(--color-coral)" },
  medium: { bg: "rgba(56, 189, 248, 0.15)", text: "var(--color-sky)" },
  low: { bg: "rgba(74, 222, 128, 0.15)", text: "var(--color-green)" },
};

const TYPE_COLORS: Record<string, string> = {
  keyword: "var(--color-purple)",
  rate: "var(--color-sky)",
  threshold: "var(--color-coral)",
  nl: "var(--color-green)",
};

const CACHE_KEY = "clw_rule_templates_v3";
const CACHE_TTL = 60 * 60 * 1000; // 1h

export function TemplateLibrary({ defaultExpanded = false }: { defaultExpanded?: boolean }) {
  const [templates, setTemplates] = useState<Record<string, RuleTemplate[]>>({});
  const [activeCategory, setActiveCategory] = useState("safety");
  const [installing, setInstalling] = useState<string | null>(null);
  const [installed, setInstalled] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState(defaultExpanded);
  const router = useRouter();

  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadTemplates() {
    // Check localStorage cache — only use if fresh AND has all expected categories
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        const hasAllCategories = CATEGORIES.every((c) => Array.isArray(data[c]) && data[c].length > 0);
        if (Date.now() - timestamp < CACHE_TTL && hasAllCategories) {
          setTemplates(data);
          return;
        }
      }
    } catch {}

    // Fetch fresh — always go through API directly (public endpoint, no auth needed)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.clawnitor.io";
      const res = await fetch(`${apiUrl}/api/rule-templates`, { cache: "no-store" });
      if (res.ok) {
        const { by_category } = await res.json();
        setTemplates(by_category);
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({ data: by_category, timestamp: Date.now() })
        );
      }
    } catch {}
  }

  const [error, setError] = useState("");

  async function handleInstall(template: RuleTemplate) {
    setInstalling(template.id);
    setError("");
    try {
      const res = await fetch("/api/rules-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          name: template.name,
          config: { type: template.rule_type, ...template.config },
          agent_visible: template.agent_visible,
        }),
      });
      if (res.ok) {
        setInstalled((prev) => new Set(prev).add(template.id));
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.message || `Failed to add template (${res.status})`);
      }
    } catch (e) {
      setError("Failed to add template");
    }
    setInstalling(null);
  }

  const categoryTemplates = templates[activeCategory] || [];

  return (
    <div className="mt-8">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 mb-4 text-sm font-semibold"
        style={{ color: "var(--color-text-secondary)" }}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          style={{
            transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform 0.15s",
          }}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
        Template Library
        <span className="text-xs font-normal" style={{ color: "var(--color-text-tertiary)" }}>
          one-click rule templates
        </span>
      </button>

      {expanded && (
        <>
          {error && (
            <div className="p-3 rounded-lg text-sm mb-4" style={{ backgroundColor: "var(--color-coral-soft)", color: "var(--color-coral)" }}>
              {error}
            </div>
          )}
          {/* Category tabs */}
          <div className="flex gap-1 mb-4">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{
                  backgroundColor:
                    activeCategory === cat ? "var(--color-surface)" : "transparent",
                  color:
                    activeCategory === cat
                      ? "var(--color-text)"
                      : "var(--color-text-secondary)",
                  border:
                    activeCategory === cat
                      ? "1px solid var(--color-border)"
                      : "1px solid transparent",
                }}
              >
                {CATEGORY_LABELS[cat]}
                {templates[cat] && (
                  <span className="ml-1" style={{ color: "var(--color-text-tertiary)" }}>
                    {templates[cat].length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Template cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {categoryTemplates.map((t) => {
              const sev = SEVERITY_COLORS[t.severity] || SEVERITY_COLORS.medium;
              const isInstalled = installed.has(t.id);

              return (
                <div
                  key={t.id}
                  className="p-4 rounded-lg flex flex-col"
                  style={{
                    backgroundColor: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-sm font-semibold">{t.name}</h3>
                    <div className="flex gap-1.5 shrink-0 ml-2">
                      <span
                        className="text-[11px] px-1.5 py-0.5 rounded font-medium"
                        style={{ backgroundColor: sev.bg, color: sev.text }}
                      >
                        {t.severity}
                      </span>
                      <span
                        className="text-[11px] px-1.5 py-0.5 rounded font-medium"
                        style={{
                          color: TYPE_COLORS[t.rule_type] || "var(--color-text-secondary)",
                          backgroundColor: `color-mix(in srgb, ${TYPE_COLORS[t.rule_type] || "var(--color-text-secondary)"} 15%, transparent)`,
                        }}
                      >
                        {t.rule_type === "nl" ? "NL" : t.rule_type}
                      </span>
                    </div>
                  </div>

                  <p
                    className="text-xs flex-1 mb-3"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {t.description}
                  </p>

                  <div className="flex items-center justify-between">
                    {t.agent_visible && (
                      <span
                        className="text-[11px]"
                        style={{ color: "var(--color-text-tertiary)" }}
                      >
                        Agent sees this rule
                      </span>
                    )}
                    {!t.agent_visible && (
                      <span
                        className="text-[11px]"
                        style={{ color: "var(--color-text-tertiary)" }}
                      >
                        Silent enforcement
                      </span>
                    )}
                    <button
                      onClick={() => handleInstall(t)}
                      disabled={installing === t.id || isInstalled}
                      className="px-3 py-1 rounded text-xs font-medium text-white disabled:opacity-50"
                      style={{
                        backgroundColor: isInstalled
                          ? "var(--color-green)"
                          : "var(--color-coral)",
                      }}
                    >
                      {isInstalled
                        ? "Added"
                        : installing === t.id
                        ? "..."
                        : "Add"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

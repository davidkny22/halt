"use client";

import { useState } from "react";
import { ToolCombobox } from "./tool-combobox";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface Props {
  onClose: () => void;
  onCreated: () => void;
  agents?: { id: string; name: string; agent_id: string }[];
}

export function CreateRuleModal({ onClose, onCreated, agents = [] }: Props) {
  const [name, setName] = useState("");
  const [ruleType, setRuleType] = useState<"threshold" | "rate" | "keyword" | "nl">("threshold");
  const [actionMode, setActionMode] = useState<"block" | "alert" | "both">("both");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  // Threshold fields
  const [field, setField] = useState("cost_usd");
  const [operator, setOperator] = useState<"gt" | "lt">("gt");
  const [value, setValue] = useState("25");
  const [windowMinutes, setWindowMinutes] = useState("60");

  // Rate fields
  const [maxCount, setMaxCount] = useState("20");
  const [rateWindow, setRateWindow] = useState("10");
  const [toolName, setToolName] = useState("");

  // Keyword fields
  const [keywords, setKeywords] = useState("rm -rf, DROP TABLE, shutdown");
  const [matchMode, setMatchMode] = useState<"any" | "all">("any");

  // NL fields
  const [promptText, setPromptText] = useState("");

  // Rate fields - event type
  const [eventType, setEventType] = useState("");

  // Agent scope
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);

  // Visibility
  const [agentVisible, setAgentVisible] = useState(true);

  async function handleCreate() {
    if (!name.trim()) {
      setError("Rule name is required");
      return;
    }

    // Validate fields based on rule type
    if (ruleType === "threshold") {
      if (isNaN(parseFloat(value)) || parseFloat(value) <= 0) { setError("Value must be a positive number"); return; }
      if (isNaN(parseInt(windowMinutes)) || parseInt(windowMinutes) <= 0) { setError("Window must be a positive number"); return; }
    } else if (ruleType === "rate") {
      if (isNaN(parseInt(maxCount)) || parseInt(maxCount) <= 0) { setError("Max count must be a positive number"); return; }
      if (isNaN(parseInt(rateWindow)) || parseInt(rateWindow) <= 0) { setError("Window must be a positive number"); return; }
    } else if (ruleType === "keyword") {
      const kws = keywords.split(",").map((k) => k.trim()).filter(Boolean);
      if (kws.length === 0) { setError("Enter at least one keyword"); return; }
    } else if (ruleType === "nl") {
      if (!promptText.trim()) { setError("Describe your rule in plain English"); return; }
    }

    setCreating(true);
    setError("");

    let config: any;
    if (ruleType === "threshold") {
      config = { type: "threshold", field, operator, value: parseFloat(value), windowMinutes: parseInt(windowMinutes) };
    } else if (ruleType === "rate") {
      config = { type: "rate", maxCount: parseInt(maxCount), windowMinutes: parseInt(rateWindow), ...(toolName ? { toolName } : {}), ...(eventType ? { eventType } : {}) };
    } else if (ruleType === "keyword") {
      config = { type: "keyword", keywords: keywords.split(",").map((k) => k.trim()).filter(Boolean), matchMode, caseSensitive: false };
    } else {
      config = { type: "nl", promptText };
    }

    try {
      const res = await fetch("/api/rules-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          name,
          config,
          action_mode: actionMode,
          agent_visible: agentVisible,
          ...(selectedAgents.length > 0 ? { agent_ids: selectedAgents } : {}),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.message || "Failed to create rule");
        return;
      }

      onCreated();
    } catch {
      setError("Failed to create rule");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.6)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl p-6"
        style={{ backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold mb-4">Create Rule</h2>

        {error && (
          <div className="p-3 rounded-lg text-sm mb-4" style={{ backgroundColor: "var(--color-coral-soft)", color: "var(--color-coral)" }}>
            {error}
          </div>
        )}

        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: "var(--color-text-secondary)" }}>Rule Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., High spend alert"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
            />
          </div>

          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: "var(--color-text-secondary)" }}>Rule Type</label>
            <div className="flex gap-2">
              {(["threshold", "rate", "keyword", "nl"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setRuleType(t)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
                  style={{
                    backgroundColor: ruleType === t ? "var(--color-coral-soft)" : "var(--color-surface)",
                    color: ruleType === t ? "var(--color-coral)" : "var(--color-text-secondary)",
                    border: `1px solid ${ruleType === t ? "var(--color-coral)" : "var(--color-border)"}`,
                  }}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: "var(--color-text-secondary)" }}>When triggered</label>
            <div className="flex gap-2">
              {([
                { value: "both", label: "Block + Alert" },
                { value: "block", label: "Block Only" },
                { value: "alert", label: "Alert Only" },
              ] as const).map((m) => (
                <button
                  key={m.value}
                  onClick={() => setActionMode(m.value)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
                  style={{
                    backgroundColor: actionMode === m.value ? "var(--color-coral-soft)" : "var(--color-surface)",
                    color: actionMode === m.value ? "var(--color-coral)" : "var(--color-text-secondary)",
                    border: `1px solid ${actionMode === m.value ? "var(--color-coral)" : "var(--color-border)"}`,
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] mt-1" style={{ color: "var(--color-text-tertiary)" }}>
              {actionMode === "both" && "Blocks the action AND sends you an alert."}
              {actionMode === "block" && "Silently blocks the action. No notification sent."}
              {actionMode === "alert" && "Sends you an alert but lets the action proceed."}
            </p>
          </div>

          {agents.length > 0 && (
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: "var(--color-text-secondary)" }}>Applies to</label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedAgents([])}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
                  style={{
                    backgroundColor: selectedAgents.length === 0 ? "var(--color-coral-soft)" : "var(--color-surface)",
                    color: selectedAgents.length === 0 ? "var(--color-coral)" : "var(--color-text-secondary)",
                    border: `1px solid ${selectedAgents.length === 0 ? "var(--color-coral)" : "var(--color-border)"}`,
                  }}
                >
                  All agents
                </button>
                {agents.map((a) => (
                  <button
                    key={a.agent_id}
                    onClick={() => {
                      setSelectedAgents((prev) =>
                        prev.includes(a.agent_id)
                          ? prev.filter((id) => id !== a.agent_id)
                          : [...prev, a.agent_id]
                      );
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
                    style={{
                      backgroundColor: selectedAgents.includes(a.agent_id) ? "var(--color-coral-soft)" : "var(--color-surface)",
                      color: selectedAgents.includes(a.agent_id) ? "var(--color-coral)" : "var(--color-text-secondary)",
                      border: `1px solid ${selectedAgents.includes(a.agent_id) ? "var(--color-coral)" : "var(--color-border)"}`,
                    }}
                  >
                    {a.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => setAgentVisible(!agentVisible)}
                className="relative w-9 h-5 rounded-full transition-colors"
                style={{
                  backgroundColor: agentVisible ? "var(--color-coral)" : "var(--color-border)",
                }}
              >
                <div
                  className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                  style={{ left: agentVisible ? "18px" : "2px" }}
                />
              </div>
              <div>
                <span className="text-xs font-medium" style={{ color: "var(--color-text)" }}>
                  {agentVisible ? "Agent sees this rule" : "Silent enforcement"}
                </span>
                <p className="text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>
                  {agentVisible
                    ? "The agent knows this rule exists and can comply proactively."
                    : "Rule enforces silently — the agent won't know it's being checked."}
                </p>
              </div>
            </label>
          </div>

          {ruleType === "threshold" && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs block mb-1" style={{ color: "var(--color-text-secondary)" }}>Field</label>
                  <select
                    value={field}
                    onChange={(e) => setField(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
                  >
                    <option value="cost_usd">Cost (USD)</option>
                    <option value="tokens_used">Tokens Used</option>
                    <option value="duration_ms">Duration (ms)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs block mb-1" style={{ color: "var(--color-text-secondary)" }}>Operator</label>
                  <select
                    value={operator}
                    onChange={(e) => setOperator(e.target.value as "gt" | "lt")}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
                  >
                    <option value="gt">Greater than</option>
                    <option value="lt">Less than</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs block mb-1" style={{ color: "var(--color-text-secondary)" }}>Value</label>
                  <input value={value} onChange={(e) => setValue(e.target.value)} type="number" className="w-full px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text)" }} />
                </div>
                <div>
                  <label className="text-xs block mb-1" style={{ color: "var(--color-text-secondary)" }}>Window (min)</label>
                  <input value={windowMinutes} onChange={(e) => setWindowMinutes(e.target.value)} type="number" className="w-full px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text)" }} />
                </div>
              </div>
            </>
          )}

          {ruleType === "rate" && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs block mb-1" style={{ color: "var(--color-text-secondary)" }}>Max Count</label>
                  <input value={maxCount} onChange={(e) => setMaxCount(e.target.value)} type="number" className="w-full px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text)" }} />
                </div>
                <div>
                  <label className="text-xs block mb-1" style={{ color: "var(--color-text-secondary)" }}>Window (min)</label>
                  <input value={rateWindow} onChange={(e) => setRateWindow(e.target.value)} type="number" className="w-full px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text)" }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs block mb-1" style={{ color: "var(--color-text-secondary)" }}>Event Type (optional)</label>
                  <select value={eventType} onChange={(e) => setEventType(e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}>
                    <option value="">All events</option>
                    <option value="tool_use">Tool calls</option>
                    <option value="llm_call">LLM calls</option>
                    <option value="message_sent">Messages sent</option>
                    <option value="message_received">Messages received</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs block mb-1" style={{ color: "var(--color-text-secondary)" }}>Tool Name (optional)</label>
                  <ToolCombobox value={toolName} onChange={setToolName} placeholder="e.g., send_email" />
                </div>
              </div>
            </>
          )}

          {ruleType === "keyword" && (
            <>
              <div>
                <label className="text-xs block mb-1" style={{ color: "var(--color-text-secondary)" }}>Keywords (comma-separated)</label>
                <input value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="production, deploy, rm -rf" className="w-full px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text)" }} />
              </div>
              <div>
                <label className="text-xs block mb-1" style={{ color: "var(--color-text-secondary)" }}>Match Mode</label>
                <div className="flex gap-2">
                  {(["any", "all"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setMatchMode(m)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
                      style={{
                        backgroundColor: matchMode === m ? "var(--color-coral-soft)" : "var(--color-surface)",
                        color: matchMode === m ? "var(--color-coral)" : "var(--color-text-secondary)",
                        border: `1px solid ${matchMode === m ? "var(--color-coral)" : "var(--color-border)"}`,
                      }}
                    >
                      Match {m}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
          {ruleType === "nl" && (
            <div>
              <label className="text-xs block mb-1" style={{ color: "var(--color-text-secondary)" }}>Describe your rule in plain English</label>
              <textarea
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                placeholder="e.g., Alert me if my agent sends more than 10 emails in a single session, or if it tries to access any financial API"
                rows={3}
                className="w-full px-3 py-2 rounded-lg text-sm resize-none"
                style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
              />
              <p className="text-[11px] mt-1" style={{ color: "var(--color-text-tertiary)" }}>
                AI evaluates this against each event batch. Requires Pro plan (up to 5 NL rules).
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium cursor-pointer"
            style={{ border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-white cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: "var(--color-coral)" }}
          >
            {creating ? "Creating..." : "Create Rule"}
          </button>
        </div>
      </div>
    </div>
  );
}

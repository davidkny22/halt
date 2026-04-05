"use client";

import { useState, useEffect } from "react";
import { CopyBlock } from "./copy-block";

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  status: "active" | "rotated" | "revoked";
  last_used_at: string | null;
  created_at: string;
}

export function KeyManager() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newRawKey, setNewRawKey] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  useEffect(() => {
    loadKeys();
  }, []);

  async function loadKeys() {
    try {
      const res = await fetch("/api/account-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list-keys" }),
      });
      if (res.ok) {
        const data = await res.json();
        setKeys(data.keys || []);
      }
    } catch {}
    setLoading(false);
  }

  async function handleCreate() {
    setCreating(true);
    try {
      const res = await fetch("/api/account-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create-key", name: newKeyName || "Untitled" }),
      });
      if (res.ok) {
        const data = await res.json();
        setNewRawKey(data.api_key);
        setNewKeyName("");
        setShowCreate(false);
        loadKeys();
      }
    } catch {}
    setCreating(false);
  }

  async function handleRevoke(keyId: string) {
    if (!confirm("Revoke this key? It will stop working immediately.")) return;
    try {
      const res = await fetch("/api/account-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke-key", keyId }),
      });
      if (res.ok) loadKeys();
    } catch {}
  }

  async function handleRename(keyId: string) {
    try {
      const res = await fetch("/api/account-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rename-key", keyId, name: renameValue }),
      });
      if (res.ok) {
        setRenamingId(null);
        loadKeys();
      }
    } catch {}
  }

  const activeKeys = keys.filter((k) => k.status === "active");
  const inactiveKeys = keys.filter((k) => k.status !== "active");

  if (loading) return <div className="text-sm" style={{ color: "var(--color-text-secondary)" }}>Loading keys...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium">API Keys</p>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="text-xs font-medium px-2 py-1 rounded"
          style={{ color: "var(--color-coral)" }}
        >
          + New Key
        </button>
      </div>

      {/* New key just created */}
      {newRawKey && (
        <div
          className="p-3 rounded-lg mb-3"
          style={{
            backgroundColor: "rgba(74, 222, 128, 0.08)",
            border: "1px solid rgba(74, 222, 128, 0.2)",
          }}
        >
          <p className="text-xs font-medium mb-2" style={{ color: "var(--color-green)" }}>
            New key created. Save it now — it won&apos;t be shown again.
          </p>
          <CopyBlock text={newRawKey} />
          <button
            onClick={() => setNewRawKey(null)}
            className="text-xs mt-2"
            style={{ color: "var(--color-text-tertiary)" }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            placeholder="Key name (e.g. Production, Dev, Agent #1)"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            className="flex-1 px-3 py-1.5 rounded text-xs"
            style={{
              backgroundColor: "var(--color-bg)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text)",
            }}
          />
          <button
            onClick={handleCreate}
            disabled={creating}
            className="px-3 py-1.5 rounded text-xs font-medium text-white disabled:opacity-50"
            style={{ backgroundColor: "var(--color-coral)" }}
          >
            {creating ? "..." : "Create"}
          </button>
        </div>
      )}

      {/* Active keys */}
      <div className="flex flex-col gap-2">
        {activeKeys.map((key) => (
          <div
            key={key.id}
            className="flex items-center gap-3 p-3 rounded-lg"
            style={{
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)",
            }}
          >
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: "var(--color-green)" }}
            />
            <div className="flex-1 min-w-0">
              {renamingId === key.id ? (
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleRename(key.id)}
                    className="px-2 py-0.5 rounded text-xs flex-1"
                    style={{
                      backgroundColor: "var(--color-bg)",
                      border: "1px solid var(--color-border)",
                      color: "var(--color-text)",
                    }}
                    autoFocus
                  />
                  <button
                    onClick={() => handleRename(key.id)}
                    className="text-xs px-2"
                    style={{ color: "var(--color-coral)" }}
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setRenamingId(null)}
                    className="text-xs px-1"
                    style={{ color: "var(--color-text-tertiary)" }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div
                  className="text-xs font-medium cursor-pointer"
                  onClick={() => { setRenamingId(key.id); setRenameValue(key.name); }}
                  title="Click to rename"
                >
                  {key.name}
                </div>
              )}
              <code className="text-[11px]" style={{ color: "var(--color-text-tertiary)", fontFamily: "var(--font-mono)" }}>
                {key.prefix}...
              </code>
            </div>
            <div className="text-[11px] shrink-0" style={{ color: key.last_used_at ? "var(--color-text-tertiary)" : "var(--color-text-tertiary)" }}>
              {key.last_used_at
                ? `Used ${formatTimeAgo(key.last_used_at)}`
                : "Never used"}
            </div>
            <button
              onClick={() => handleRevoke(key.id)}
              className="text-[11px] px-2 py-0.5 rounded shrink-0"
              style={{ color: "var(--color-coral)" }}
            >
              Revoke
            </button>
          </div>
        ))}
      </div>

      {/* Inactive keys */}
      {inactiveKeys.length > 0 && (
        <details className="mt-3">
          <summary className="text-[11px] cursor-pointer" style={{ color: "var(--color-text-tertiary)" }}>
            {inactiveKeys.length} inactive key{inactiveKeys.length > 1 ? "s" : ""}
          </summary>
          <div className="flex flex-col gap-1 mt-1">
            {inactiveKeys.map((key) => (
              <div
                key={key.id}
                className="flex items-center gap-3 px-3 py-2 rounded text-[11px]"
                style={{ color: "var(--color-text-tertiary)" }}
              >
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: "var(--color-text-tertiary)" }}
                />
                <span>{key.name}</span>
                <code style={{ fontFamily: "var(--font-mono)" }}>{key.prefix}...</code>
                <span className="ml-auto">{key.status}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

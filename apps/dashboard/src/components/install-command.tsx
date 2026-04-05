"use client";

import { useState } from "react";

export function InstallCommand({ command = "openclaw plugins install @halt/plugin" }: { command?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for browsers without clipboard API
      const textarea = document.createElement("textarea");
      textarea.value = command;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="glass inline-flex items-center gap-3 px-5 py-3 rounded-xl text-sm sm:text-base mb-6 transition-all hover:translate-y-[-1px] cursor-pointer group"
      style={{ fontFamily: "var(--font-mono)" }}
    >
      <span style={{ color: "var(--color-text-tertiary)" }}>$</span>
      <span style={{ color: "var(--color-coral)" }}>{command}</span>
      <span
        className="text-xs px-2 py-0.5 rounded-md transition-all"
        style={{
          backgroundColor: copied ? "rgba(74, 222, 128, 0.15)" : "var(--color-surface)",
          color: copied ? "var(--color-green)" : "var(--color-text-tertiary)",
          border: copied ? "1px solid rgba(74, 222, 128, 0.3)" : "1px solid var(--color-border)",
        }}
      >
        {copied ? "copied!" : "copy"}
      </span>
    </button>
  );
}

"use client";

import { useState } from "react";

export function CopyBlock({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="relative group">
      {label && (
        <p
          className="text-xs mb-2"
          style={{ color: "var(--color-text-tertiary)" }}
        >
          {label}
        </p>
      )}
      <div
        className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm"
        style={{
          backgroundColor: "var(--color-bg)",
          border: "1px solid var(--color-border)",
          fontFamily: "var(--font-mono)",
        }}
      >
        <code
          className="flex-1 overflow-x-auto"
          style={{ color: "var(--color-coral)" }}
        >
          {text}
        </code>
        <button
          onClick={handleCopy}
          className="shrink-0 px-2 py-1 rounded text-xs transition-all cursor-pointer"
          style={{
            color: copied ? "var(--color-green)" : "var(--color-text-tertiary)",
            border: `1px solid ${copied ? "var(--color-green)" : "var(--color-border)"}`,
          }}
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
}

export function CopyMultiBlock({
  text,
  label,
}: {
  text: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <div>
      {label && (
        <p
          className="text-xs mb-2"
          style={{ color: "var(--color-text-tertiary)" }}
        >
          {label}
        </p>
      )}
      <div
        className="rounded-lg"
        style={{
          backgroundColor: "var(--color-bg)",
          border: "1px solid var(--color-border)",
        }}
      >
        <div className="flex items-center justify-end px-3 py-1.5" style={{ borderBottom: "1px solid var(--color-border)" }}>
          <button
            onClick={handleCopy}
            className="px-2 py-1 rounded text-xs transition-all cursor-pointer"
            style={{
              color: copied ? "var(--color-green)" : "var(--color-text-tertiary)",
              border: `1px solid ${copied ? "var(--color-green)" : "var(--color-border)"}`,
              backgroundColor: "var(--color-bg)",
            }}
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <div className="px-4 py-3 overflow-x-auto">
          <pre className="text-xs" style={{ color: "var(--color-text-secondary)", fontFamily: "var(--font-mono)" }}>{text}</pre>
        </div>
      </div>
    </div>
  );
}

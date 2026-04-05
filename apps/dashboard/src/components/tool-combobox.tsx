"use client";

import { useState, useRef, useEffect } from "react";

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function ToolCombobox({ value, onChange, placeholder = "e.g., exec" }: Props) {
  const [tools, setTools] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loaded) {
      fetch("/api/agents-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get-tools" }),
      })
        .then((r) => r.json())
        .then((d) => { setTools(d.tools || []); setLoaded(true); })
        .catch(() => setLoaded(true));
    }
  }, [loaded]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = tools.filter((t) =>
    !value || t.toLowerCase().includes(value.toLowerCase())
  );

  const showCustom = value.trim() && !tools.includes(value.trim());

  return (
    <div ref={ref} className="relative">
      <input
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg text-sm outline-none"
        style={{
          backgroundColor: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          color: "var(--color-text)",
        }}
      />
      {open && (filtered.length > 0 || showCustom) && (
        <div
          className="absolute z-50 w-full mt-1 rounded-lg overflow-hidden max-h-48 overflow-y-auto"
          style={{
            backgroundColor: "var(--color-bg)",
            border: "1px solid var(--color-border)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          }}
        >
          {showCustom && (
            <button
              onClick={() => { onChange(value.trim()); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm"
              style={{ color: "var(--color-coral)" }}
            >
              Use &ldquo;{value.trim()}&rdquo;
            </button>
          )}
          {filtered.map((t) => (
            <button
              key={t}
              onClick={() => { onChange(t); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm hover:opacity-80"
              style={{
                color: "var(--color-text)",
                backgroundColor: t === value ? "var(--color-surface)" : "transparent",
                fontFamily: "var(--font-mono)",
              }}
            >
              {t}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

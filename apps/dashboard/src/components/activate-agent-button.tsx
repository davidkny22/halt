"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ActivateAgentButton({ agentId }: { agentId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleActivate(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    try {
      await fetch("/api/agents-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "activate", agentId }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleActivate}
      disabled={loading}
      className="text-xs font-medium px-3 py-1.5 rounded-md transition-opacity"
      style={{
        backgroundColor: "var(--color-coral)",
        color: "#fff",
        opacity: loading ? 0.6 : 1,
      }}
    >
      {loading ? "Activating..." : "Activate"}
    </button>
  );
}

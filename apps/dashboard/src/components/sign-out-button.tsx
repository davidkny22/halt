"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className="text-xs px-2 py-1 rounded-md transition-colors hover:opacity-80"
      style={{
        color: "var(--color-text-tertiary)",
        border: "1px solid var(--color-border)",
      }}
    >
      Sign Out
    </button>
  );
}

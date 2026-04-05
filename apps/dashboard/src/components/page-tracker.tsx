"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// Anonymous session ID — persists across page views in same tab, resets on close
function getSessionId(): string {
  let id = sessionStorage.getItem("clw_sid");
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem("clw_sid", id);
  }
  return id;
}

export function PageTracker() {
  const pathname = usePathname();
  const initialized = useRef(false);

  useEffect(() => {
    // Small delay to avoid tracking during redirects
    const timer = setTimeout(() => {
      fetch(`${API_URL}/api/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: pathname,
          referrer: document.referrer || null,
          user_agent: navigator.userAgent,
          session_id: getSessionId(),
          screen_width: window.innerWidth,
        }),
      }).catch(() => {});
    }, 100);

    return () => clearTimeout(timer);
  }, [pathname]);

  return null;
}

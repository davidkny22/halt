"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

export function MobileNav({
  items,
  tier,
  tierLabel,
  tierColors,
  savesCount,
  email,
  trialDaysLeft,
}: {
  items: NavItem[];
  tier: string;
  tierLabel: string;
  tierColors: { bg: string; text: string };
  savesCount: number;
  email?: string;
  trialDaysLeft?: number | null;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      {/* Hamburger button — visible only on mobile */}
      <button
        onClick={() => setOpen(!open)}
        className="md:hidden flex items-center justify-center w-8 h-8 rounded"
        style={{ color: "var(--color-text)" }}
        aria-label="Toggle navigation"
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        )}
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-40"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* Slide-out menu */}
      <div
        className={`md:hidden fixed top-0 right-0 z-50 h-full w-64 transform transition-transform duration-200 ${open ? "translate-x-0" : "translate-x-full"}`}
        style={{ backgroundColor: "var(--color-bg)", borderLeft: "1px solid var(--color-border)" }}
      >
        <div className="flex flex-col h-full">
          {/* Close button */}
          <div className="flex justify-end p-4">
            <button onClick={() => setOpen(false)} style={{ color: "var(--color-text-secondary)" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          {/* Nav items */}
          <nav className="flex flex-col gap-1 px-3">
            {items.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: active ? "var(--color-coral-soft)" : "transparent",
                    color: active ? "var(--color-coral)" : "var(--color-text-secondary)",
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={item.icon} />
                  </svg>
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Bottom section */}
          <div className="mt-auto p-4 flex flex-col gap-3" style={{ borderTop: "1px solid var(--color-border)" }}>
            {savesCount > 0 && (
              <Link
                href="/saves"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 text-xs font-medium"
                style={{ color: "var(--color-green)" }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                {savesCount} saves
              </Link>
            )}
            <span
              className="text-xs px-2 py-1 rounded-full font-medium w-fit"
              style={{ backgroundColor: tierColors.bg, color: tierColors.text }}
            >
              {tier === "paid" ? "Pro" : tier === "trial" ? `Pro Trial${trialDaysLeft != null ? ` · ${trialDaysLeft}d` : ""}` : tierLabel}
            </span>
            {email && (
              <span className="text-xs truncate" style={{ color: "var(--color-text-tertiary)" }}>
                {email}
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

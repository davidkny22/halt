"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function NavIcon({ d, size = 16 }: { d: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: "inline-block", verticalAlign: "-2px", marginRight: "6px" }}
    >
      <path d={d} />
    </svg>
  );
}

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

export function DashboardNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1">
      {items.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className="text-sm font-medium transition-colors flex items-center px-3 py-1.5 rounded-lg"
            style={{
              color: isActive ? "var(--color-text)" : "var(--color-text-secondary)",
              backgroundColor: isActive ? "var(--color-surface)" : "transparent",
              border: isActive ? "1px solid var(--color-border)" : "1px solid transparent",
            }}
          >
            <NavIcon d={item.icon} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

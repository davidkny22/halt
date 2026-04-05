import Link from "next/link";
import { redirect } from "next/navigation";
import { LogoFull } from "@/components/logo";
import { auth } from "@/auth";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { getSavesCount } from "@/lib/server-api";
import { FeedbackWidget } from "@/components/feedback-widget";
import { DashboardNav } from "@/components/dashboard-nav";
import { MobileNav } from "@/components/mobile-nav";

const navItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10",
  },
  {
    href: "/rules",
    label: "Rules",
    icon: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8",
  },
  {
    href: "/alerts",
    label: "Alerts",
    icon: "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0",
  },
  {
    href: "/agents",
    label: "Agents",
    icon: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
  },
  {
    href: "/settings",
    label: "Settings",
    icon: "M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
  },
];

const teamNavItem = {
  href: "/team",
  label: "Team",
  icon: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
};

const enterpriseNavItem = {
  href: "/enterprise",
  label: "Enterprise",
  icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
};

const tierColors: Record<string, { bg: string; text: string }> = {
  free: { bg: "var(--color-coral-soft)", text: "var(--color-coral)" },
  trial: { bg: "rgba(56, 189, 248, 0.15)", text: "var(--color-sky)" },
  paid: { bg: "rgba(74, 222, 128, 0.15)", text: "var(--color-green)" },
  team: { bg: "rgba(56, 189, 248, 0.15)", text: "var(--color-sky)" },
  enterprise: { bg: "rgba(167, 139, 250, 0.15)", text: "var(--color-purple)" },
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }

  // Fetch user info for tier
  let tier = "free";
  let trialDaysLeft: number | null = null;
  try {
    const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET || "";
    const res = await fetch(
      `${API_URL}/api/auth/me?email=${encodeURIComponent(session.user.email)}`,
      { cache: "no-store", headers: { "X-Internal-Secret": INTERNAL_SECRET } }
    );
    if (res.ok) {
      const data = await res.json();
      tier = data.tier || "free";
      if (tier === "trial" && data.beta_expires_at) {
        const expires = new Date(data.beta_expires_at).getTime();
        const now = Date.now();
        trialDaysLeft = Math.max(0, Math.ceil((expires - now) / (1000 * 60 * 60 * 24)));
      }
    }
  } catch {}

  // Fetch saves count
  const savesData = await getSavesCount();
  const savesCount = savesData?.count ?? 0;

  const isTeamTier = tier === "paid" || tier === "trial"; // Show team for paid/trial users
  const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1);
  const colors = tierColors[tier] || tierColors.free;

  const isEnterprise = tier === "enterprise";
  let allNavItems = [...navItems];
  if (isTeamTier || isEnterprise) {
    allNavItems = [...navItems.slice(0, 4), teamNavItem, navItems[4]];
  }
  if (isEnterprise) {
    allNavItems.push(enterpriseNavItem);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header
        className="flex items-center justify-between px-4 md:px-6 py-3"
        style={{ borderBottom: "1px solid var(--color-border)" }}
      >
        <Link href="/dashboard">
          <LogoFull size={22} />
        </Link>

        {/* Desktop nav — hidden on mobile */}
        <div className="hidden md:flex justify-center">
          <DashboardNav items={allNavItems} />
        </div>

        {/* Desktop right actions — hidden on mobile */}
        <div className="hidden md:flex items-center gap-3 justify-end">
          {savesCount > 0 && (
            <Link
              href="/saves"
              className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition-colors hover:opacity-80"
              style={{
                backgroundColor: "rgba(74, 222, 128, 0.1)",
                color: "var(--color-green)",
                border: "1px solid rgba(74, 222, 128, 0.2)",
              }}
              title={`Clawnitor has blocked ${savesCount} harmful action${savesCount === 1 ? "" : "s"}`}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              {savesCount}
            </Link>
          )}
          <span
            className="text-xs px-2 py-1 rounded-full font-medium"
            style={{ backgroundColor: colors.bg, color: colors.text }}
          >
            {tier === "paid" ? "Pro" : tier === "trial" ? `Pro Trial${trialDaysLeft != null ? ` · ${trialDaysLeft}d` : ""}` : tierLabel}
          </span>
          {session?.user?.email && (
            <span className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
              {session.user.email}
            </span>
          )}
          <ThemeToggle />
          <SignOutButton />
        </div>

        {/* Mobile: theme toggle + hamburger */}
        <div className="flex md:hidden items-center gap-2">
          <ThemeToggle />
          <MobileNav
            items={allNavItems}
            tier={tier}
            tierLabel={tierLabel}
            tierColors={colors}
            savesCount={savesCount}
            email={session?.user?.email || undefined}
            trialDaysLeft={trialDaysLeft}
          />
        </div>
      </header>

      <main className="flex-1 px-4 md:px-6 py-4 md:py-6 max-w-7xl mx-auto w-full">
        {children}
      </main>

      <FeedbackWidget />
    </div>
  );
}

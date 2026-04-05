import Link from "next/link";

const navItems = [
  { href: "/", label: "Dashboard", icon: "📊" },
  { href: "/rules", label: "Rules", icon: "📋" },
  { href: "/alerts", label: "Alerts", icon: "🔔" },
  { href: "/agents", label: "Agents", icon: "🤖" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Nav */}
      <header
        className="flex items-center justify-between px-6 py-3"
        style={{ borderBottom: "1px solid var(--color-border)" }}
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">🦞</span>
          <span className="font-bold text-lg">Clawnitor</span>
        </div>
        <nav className="flex gap-6">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium transition-colors hover:opacity-80"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <span
            className="text-xs px-2 py-1 rounded-full font-medium"
            style={{
              backgroundColor: "var(--color-coral-soft)",
              color: "var(--color-coral)",
            }}
          >
            FREE
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-6 py-6 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}

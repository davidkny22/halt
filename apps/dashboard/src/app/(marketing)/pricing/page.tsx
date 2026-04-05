import Link from "next/link";

export default function PricingPage() {
  return (
    <div className="min-h-screen px-6 md:px-12 py-20 max-w-3xl mx-auto">
      <div className="text-center mb-12">
        <Link href="/" className="inline-flex items-center gap-2 mb-8 text-sm" style={{ color: "var(--color-text-secondary)" }}>
          ← Back to home
        </Link>
        <h1 className="text-3xl font-bold mb-4">Pricing</h1>
        <p style={{ color: "var(--color-text-secondary)" }}>
          Free forever for basic monitoring. Pro when you need the big claws.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
        <div className="p-8 rounded-2xl" style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          <h2 className="text-lg font-semibold mb-1">Free</h2>
          <div className="text-4xl font-bold mb-6">$0<span className="text-sm font-normal ml-1" style={{ color: "var(--color-text-secondary)" }}>/forever</span></div>
          <ul className="flex flex-col gap-3 text-sm">
            <li className="flex gap-2"><span style={{ color: "var(--color-green)" }}>✓</span> Full event audit trail</li>
            <li className="flex gap-2"><span style={{ color: "var(--color-green)" }}>✓</span> 3 pattern rules</li>
            <li className="flex gap-2"><span style={{ color: "var(--color-green)" }}>✓</span> Email alerts</li>
            <li className="flex gap-2"><span style={{ color: "var(--color-green)" }}>✓</span> 7-day event history</li>
          </ul>
        </div>

        <div className="p-8 rounded-2xl" style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-coral)" }}>
          <h2 className="text-lg font-semibold mb-1">Pro</h2>
          <div className="text-4xl font-bold mb-6">$5<span className="text-sm font-normal ml-1" style={{ color: "var(--color-text-secondary)" }}>/mo + $3/agent</span></div>
          <ul className="flex flex-col gap-3 text-sm">
            <li className="flex gap-2"><span style={{ color: "var(--color-green)" }}>✓</span> Everything in Free</li>
            <li className="flex gap-2"><span style={{ color: "var(--color-coral)" }}>✓</span> Kill switch</li>
            <li className="flex gap-2"><span style={{ color: "var(--color-coral)" }}>✓</span> AI anomaly detection</li>
            <li className="flex gap-2"><span style={{ color: "var(--color-coral)" }}>✓</span> Natural language rules</li>
            <li className="flex gap-2"><span style={{ color: "var(--color-green)" }}>✓</span> Unlimited rules</li>
            <li className="flex gap-2"><span style={{ color: "var(--color-green)" }}>✓</span> Telegram, Discord, SMS</li>
            <li className="flex gap-2"><span style={{ color: "var(--color-green)" }}>✓</span> 90-day event history</li>
          </ul>
        </div>
      </div>

      <div className="text-center">
        <p className="text-sm mb-4" style={{ color: "var(--color-text-secondary)" }}>
          14-day free trial of Pro. No credit card required.
        </p>
        <Link href="/signup" className="inline-block px-8 py-3 rounded-lg font-semibold text-white" style={{ backgroundColor: "var(--color-coral)" }}>
          Get Started Free
        </Link>
      </div>
    </div>
  );
}

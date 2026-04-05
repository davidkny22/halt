import Link from "next/link";

export default function PricingPage() {
  return (
    <div className="min-h-screen px-6 md:px-12 py-20 max-w-6xl mx-auto">
      <div className="text-center mb-12">
        <Link href="/" className="inline-flex items-center gap-2 mb-8 text-sm" style={{ color: "var(--color-text-secondary)" }}>
          ← Back to home
        </Link>
        <h1 className="text-3xl font-bold mb-4">Pricing</h1>
        <p style={{ color: "var(--color-text-secondary)" }}>
          Free forever locally. Pro when you need the big claws.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-16">
        {/* Open Source */}
        <div className="p-6 rounded-2xl" style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          <h2 className="text-lg font-semibold mb-1">Open Source</h2>
          <p className="text-xs mb-5" style={{ color: "var(--color-text-secondary)" }}>Local, no account</p>
          <div className="mb-5">
            <span className="text-3xl font-bold">Free</span>
            <span className="text-xs ml-1" style={{ color: "var(--color-text-secondary)" }}>/forever</span>
          </div>
          <code className="block text-center px-3 py-2.5 rounded-lg text-[10px] mb-6" style={{ backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border)", fontFamily: "var(--font-mono)", color: "var(--color-coral)" }}>
            openclaw plugins install
          </code>
          <ul className="flex flex-col gap-2.5 text-xs">
            <li className="flex gap-2"><span style={{ color: "var(--color-green)" }}>✓</span> Unlimited agents</li>
            <li className="flex gap-2"><span style={{ color: "var(--color-green)" }}>✓</span> Unlimited pattern rules</li>
            <li className="flex gap-2"><span style={{ color: "var(--color-green)" }}>✓</span> Injection detection (180 patterns)</li>
            <li className="flex gap-2"><span style={{ color: "var(--color-green)" }}>✓</span> Kill switch + auto-kill</li>
            <li className="flex gap-2"><span style={{ color: "var(--color-green)" }}>✓</span> Spend + rate limits</li>
            <li className="flex gap-2"><span style={{ color: "var(--color-green)" }}>✓</span> Local dashboard</li>
            <li className="flex gap-2"><span style={{ color: "var(--color-green)" }}>✓</span> MIT licensed</li>
          </ul>
        </div>

        {/* Pro */}
        <div className="p-6 rounded-2xl relative" style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-coral)", boxShadow: "0 0 0 1px rgba(255, 107, 74, 0.1), 0 8px 32px -8px rgba(255, 107, 74, 0.15)" }}>
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-semibold text-white" style={{ backgroundColor: "var(--color-coral)" }}>
            Recommended
          </div>
          <h2 className="text-lg font-semibold mb-1">Pro</h2>
          <p className="text-xs mb-5" style={{ color: "var(--color-text-secondary)" }}>Full protection</p>
          <div className="mb-2">
            <span className="text-3xl font-bold">$5</span>
            <span className="text-xs ml-1" style={{ color: "var(--color-text-secondary)" }}>/mo + $3/agent</span>
          </div>
          <p className="text-[10px] mb-5" style={{ color: "var(--color-green)" }}>
            Early access pricing — locked in for founding members
          </p>
          <Link href="https://app.clawnitor.io/signup" className="block text-center px-4 py-2.5 rounded-lg font-semibold text-xs text-white mb-6" style={{ backgroundColor: "var(--color-coral)" }}>
            Start Free Trial
          </Link>
          <ul className="flex flex-col gap-2.5 text-xs">
            <li className="flex gap-2"><span style={{ color: "var(--color-coral)" }}>✓</span> <strong>Unlimited kills + auto-kill</strong></li>
            <li className="flex gap-2"><span style={{ color: "var(--color-coral)" }}>✓</span> <strong>AI anomaly detection</strong></li>
            <li className="flex gap-2"><span style={{ color: "var(--color-coral)" }}>✓</span> <strong>Cost analytics + spend trends</strong></li>
            <li className="flex gap-2"><span style={{ color: "var(--color-coral)" }}>✓</span> <strong>Session timelines</strong></li>
            <li className="flex gap-2"><span style={{ color: "var(--color-coral)" }}>✓</span> <strong>Up to 5 NL rules</strong></li>
            <li className="flex gap-2"><span style={{ color: "var(--color-green)" }}>✓</span> 1 agent (+$3/ea)</li>
            <li className="flex gap-2"><span style={{ color: "var(--color-green)" }}>✓</span> All alert channels</li>
            <li className="flex gap-2"><span style={{ color: "var(--color-green)" }}>✓</span> 90-day event history</li>
            <li className="flex gap-2"><span style={{ color: "var(--color-green)" }}>✓</span> 14-day free trial</li>
          </ul>
        </div>

        {/* Team */}
        <div className="p-6 rounded-2xl" style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          <h2 className="text-lg font-semibold mb-1">Team</h2>
          <p className="text-xs mb-5" style={{ color: "var(--color-text-secondary)" }}>Scale with your team</p>
          <div className="mb-2">
            <span className="text-3xl font-bold">$19</span>
            <span className="text-xs ml-1" style={{ color: "var(--color-text-secondary)" }}>/mo + $2/agent</span>
          </div>
          <p className="text-[10px] mb-5" style={{ color: "var(--color-green)" }}>
            Early access pricing — locked in for founding members
          </p>
          <Link href="https://app.clawnitor.io/signup" className="block text-center px-4 py-2.5 rounded-lg font-semibold text-xs mb-6" style={{ border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}>
            Upgrade to Team
          </Link>
          <ul className="flex flex-col gap-2.5 text-xs">
            <li className="flex gap-2"><span style={{ color: "var(--color-green)" }}>✓</span> Everything in Pro</li>
            <li className="flex gap-2"><span style={{ color: "var(--color-sky)" }}>✓</span> <strong>5 agents included (+$2/ea)</strong></li>
            <li className="flex gap-2"><span style={{ color: "var(--color-sky)" }}>✓</span> <strong>Up to 20 NL rules</strong></li>
            <li className="flex gap-2"><span style={{ color: "var(--color-sky)" }}>✓</span> <strong>5-min AI evaluation cycle</strong></li>
            <li className="flex gap-2"><span style={{ color: "var(--color-sky)" }}>✓</span> <strong>10 team members</strong></li>
            <li className="flex gap-2"><span style={{ color: "var(--color-green)" }}>✓</span> Unlimited shared rules</li>
            <li className="flex gap-2"><span style={{ color: "var(--color-green)" }}>✓</span> 1-year event history</li>
          </ul>
        </div>

        {/* Enterprise */}
        <div className="p-6 rounded-2xl" style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          <h2 className="text-lg font-semibold mb-1">Enterprise</h2>
          <p className="text-xs mb-5" style={{ color: "var(--color-text-secondary)" }}>Custom everything</p>
          <div className="mb-5">
            <span className="text-3xl font-bold">Custom</span>
          </div>
          <a href="mailto:david@clawnitor.io" className="block text-center px-4 py-2.5 rounded-lg font-semibold text-xs mb-6" style={{ border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}>
            Contact Us
          </a>
          <ul className="flex flex-col gap-2.5 text-xs">
            <li className="flex gap-2"><span style={{ color: "var(--color-green)" }}>✓</span> Everything in Team</li>
            <li className="flex gap-2"><span style={{ color: "var(--color-purple)" }}>✓</span> <strong>Unlimited agents + teams</strong></li>
            <li className="flex gap-2"><span style={{ color: "var(--color-purple)" }}>✓</span> <strong>SSO / SAML</strong></li>
            <li className="flex gap-2"><span style={{ color: "var(--color-purple)" }}>✓</span> <strong>Audit logs</strong></li>
            <li className="flex gap-2"><span style={{ color: "var(--color-purple)" }}>✓</span> <strong>Custom roles + webhooks</strong></li>
            <li className="flex gap-2"><span style={{ color: "var(--color-green)" }}>✓</span> Unlimited history</li>
            <li className="flex gap-2"><span style={{ color: "var(--color-green)" }}>✓</span> Dedicated support + SLA</li>
          </ul>
        </div>
      </div>

      <div className="text-center">
        <p className="text-sm mb-4" style={{ color: "var(--color-text-secondary)" }}>
          14-day free trial of Pro. No credit card required.
        </p>
        <Link href="https://app.clawnitor.io/signup" className="inline-block px-8 py-3 rounded-lg font-semibold text-white" style={{ backgroundColor: "var(--color-coral)" }}>
          Get Started Free
        </Link>
      </div>
    </div>
  );
}

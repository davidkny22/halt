import Link from "next/link";
import { LogoMark, LogoFull } from "@/components/logo";

const features = [
  {
    icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
    title: "See Everything",
    description:
      "Every tool call, LLM request, message, and lifecycle event — captured in real-time with zero config.",
    color: "var(--color-sky)",
  },
  {
    icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
    title: "Smart Rules",
    description:
      "Threshold, rate, keyword — or just describe what you want in plain English. Clawnitor understands.",
    color: "var(--color-purple)",
  },
  {
    icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>`,
    title: "Kill Switch",
    description:
      "Instant in-process blocking. Your agent stops before the next action — not after the damage is done.",
    color: "var(--color-coral)",
  },
  {
    icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`,
    title: "Anomaly Detection",
    description:
      "72-hour behavioral baseline. Clawnitor learns what normal looks like, then flags what isn't.",
    color: "var(--color-green)",
  },
  {
    icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
    title: "Multi-Channel Alerts",
    description:
      "Email, Telegram, Discord, SMS. Get notified where you actually look, not where you forget to check.",
    color: "var(--color-yellow)",
  },
  {
    icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
    title: "Local Failsafe",
    description:
      "Spend limits, rate limits, tool blocklists — always active, even when the internet isn't.",
    color: "var(--color-coral)",
  },
];

const steps = [
  {
    step: "01",
    title: "Install the plugin",
    description: "One command. Works with any OpenClaw agent.",
    code: "openclaw plugins install @clawnitor/plugin",
  },
  {
    step: "02",
    title: "Add your API key",
    description: "Sign up at clawnitor.io, paste your key into openclaw.json.",
    code: '{ "apiKey": "clw_live_..." }',
  },
  {
    step: "03",
    title: "Sleep peacefully",
    description:
      "Your agents are monitored. You'll know if anything goes wrong.",
    code: "🦞 monitoring...",
  },
];

const faqs = [
  {
    q: "What is Clawnitor?",
    a: "Clawnitor is a monitoring and safety layer for autonomous AI agents running on OpenClaw. It watches everything your agent does, evaluates custom rules, and can instantly pause runaway agents.",
  },
  {
    q: "How is this different from ClawMetry / SafeClaw / DeadClaw?",
    a: "Those tools do one thing well — dashboards, security patterns, or emergency kills. Clawnitor is the only product that combines monitoring, intelligent rules, AI anomaly detection, AND intervention into one platform.",
  },
  {
    q: "Does the kill switch actually work instantly?",
    a: "Yes. The kill switch runs in-process inside your OpenClaw agent via the before_tool_call hook. It blocks the next action before execution — zero network latency. Server-triggered kills arrive via WebSocket with HTTPS fallback.",
  },
  {
    q: "What happens if your backend goes down?",
    a: "Your agents stay protected. The local failsafe (spend limits, rate limits, tool blocklist) works independently. Events are cached locally in SQLite and flushed when connection restores. No monitoring gaps.",
  },
  {
    q: "Is my data safe?",
    a: "Secrets are automatically redacted before transmission. Data sharing for improving Clawnitor is opt-in (default OFF). We're a safety company — we default to protecting your data.",
  },
  {
    q: "Can I try the paid features?",
    a: "Yes — 14-day free trial of Pro, no credit card required. You'll have full access to the kill switch, AI anomaly detection, and unlimited rules.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-hidden">
      {/* Ambient background glow */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background:
            "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(255, 107, 74, 0.08), transparent)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 md:px-12 py-5 max-w-7xl mx-auto">
        <LogoFull size={26} />
        <div className="flex items-center gap-8">
          <a
            href="#features"
            className="text-sm hidden md:block"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Features
          </a>
          <a
            href="#pricing"
            className="text-sm hidden md:block"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Pricing
          </a>
          <a
            href="#faq"
            className="text-sm hidden md:block"
            style={{ color: "var(--color-text-secondary)" }}
          >
            FAQ
          </a>
          <Link
            href="https://app.clawnitor.io/login"
            className="text-sm font-medium"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Sign In
          </Link>
          <Link
            href="https://app.clawnitor.io/signup"
            className="text-sm font-semibold px-4 py-2 rounded-lg text-white"
            style={{ backgroundColor: "var(--color-coral)" }}
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* ═══════════════ HERO ═══════════════ */}
      <section className="relative z-10 px-6 md:px-12 pt-20 pb-32 max-w-5xl mx-auto text-center">
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium mb-8"
          style={{
            backgroundColor: "var(--color-coral-soft)",
            color: "var(--color-coral)",
            border: "1px solid rgba(255, 107, 74, 0.2)",
          }}
        >
          <span className="relative flex h-2 w-2">
            <span
              className="absolute inline-flex h-full w-full rounded-full opacity-75"
              style={{
                backgroundColor: "var(--color-coral)",
                animation:
                  "ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite",
              }}
            />
            <span
              className="relative inline-flex rounded-full h-2 w-2"
              style={{ backgroundColor: "var(--color-coral)" }}
            />
          </span>
          The safety net for OpenClaw agents
        </div>

        <h1
          className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1] mb-6"
          style={{ letterSpacing: "-0.03em" }}
        >
          Your agents run
          <br />
          while you sleep.
          <br />
          <span
            style={{
              background:
                "linear-gradient(135deg, #FF6B4A 0%, #FF8F73 50%, #FFB199 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            We keep our claws on them.
          </span>
        </h1>

        <p
          className="text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
          style={{ color: "var(--color-text-secondary)" }}
        >
          The all-in-one monitoring and intervention framework for OpenClaw.
          Event capture. Smart rules. AI anomaly detection. Kill switch. One
          plugin, total peace of mind.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <Link
            href="https://app.clawnitor.io/signup"
            className="group px-8 py-4 rounded-xl font-semibold text-white text-base inline-flex items-center justify-center gap-2 transition-all"
            style={{
              backgroundColor: "var(--color-coral)",
              boxShadow:
                "0 0 0 0 rgba(255, 107, 74, 0.4), 0 8px 32px -8px rgba(255, 107, 74, 0.3)",
            }}
          >
            Start Monitoring Free
            <span className="transition-transform group-hover:translate-x-0.5">
              →
            </span>
          </Link>
          <a
            href="#how-it-works"
            className="px-8 py-4 rounded-xl font-semibold text-base inline-flex items-center justify-center gap-2"
            style={{
              border: "1px solid var(--color-border)",
              color: "var(--color-text-secondary)",
            }}
          >
            See How It Works
          </a>
        </div>

        {/* Dashboard Preview */}
        <div
          className="relative mx-auto max-w-4xl rounded-2xl overflow-hidden"
          style={{
            border: "1px solid var(--color-border)",
            boxShadow:
              "0 32px 64px -16px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.03)",
          }}
        >
          <div
            className="flex items-center gap-2 px-4 py-3"
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.03)",
              borderBottom: "1px solid var(--color-border)",
            }}
          >
            <div className="flex gap-1.5">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: "rgba(255, 255, 255, 0.1)" }}
              />
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: "rgba(255, 255, 255, 0.1)" }}
              />
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: "rgba(255, 255, 255, 0.1)" }}
              />
            </div>
            <div
              className="flex-1 mx-12 px-3 py-1 rounded-md text-xs text-center"
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                color: "var(--color-text-tertiary)",
              }}
            >
              clawnitor.io/dashboard
            </div>
          </div>

          <div className="p-6" style={{ backgroundColor: "var(--color-bg)" }}>
            <div className="grid grid-cols-4 gap-3 mb-5">
              {[
                { label: "Events Today", value: "1,847", color: "var(--color-text)" },
                { label: "Status", value: "Normal", color: "var(--color-green)" },
                { label: "Spend Today", value: "$4.21", color: "var(--color-text)" },
                { label: "Alerts", value: "2", color: "var(--color-yellow)" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="p-3 rounded-lg text-center"
                  style={{
                    backgroundColor: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <div className="text-lg font-bold" style={{ color: s.color }}>
                    {s.value}
                  </div>
                  <div
                    className="text-[10px] mt-0.5"
                    style={{ color: "var(--color-text-tertiary)" }}
                  >
                    {s.label}
                  </div>
                </div>
              ))}
            </div>

            <div
              className="rounded-lg"
              style={{ border: "1px solid var(--color-border)" }}
            >
              <div
                className="px-3 py-2 text-xs font-medium"
                style={{
                  borderBottom: "1px solid var(--color-border)",
                  color: "var(--color-text-secondary)",
                }}
              >
                Activity Feed — Email Agent
              </div>
              {[
                { time: "2:41 PM", type: "tool", color: "var(--color-sky)", text: "send_email → marketing@client.com", sev: "normal" },
                { time: "2:40 PM", type: "llm", color: "var(--color-purple)", text: "claude-haiku → 847 tokens ($0.002)", sev: "normal" },
                { time: "2:38 PM", type: "alert", color: "var(--color-coral)", text: "15 emails sent in 10 min — rule triggered", sev: "elevated" },
                { time: "2:35 PM", type: "tool", color: "var(--color-sky)", text: "read_file → /templates/weekly-report.md", sev: "normal" },
                { time: "2:34 PM", type: "start", color: "var(--color-green)", text: "Agent run started — weekly email batch", sev: "normal" },
              ].map((e, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 px-3 py-1.5 text-[11px]"
                  style={{
                    borderBottom: "1px solid var(--color-border)",
                    backgroundColor: e.sev === "elevated" ? "var(--color-coral-soft)" : "transparent",
                    borderLeft: e.sev === "elevated" ? "2px solid var(--color-coral)" : "2px solid transparent",
                  }}
                >
                  <span style={{ color: "var(--color-text-tertiary)", minWidth: "48px" }}>{e.time}</span>
                  <span style={{ color: e.color, minWidth: "32px" }}>{e.type}</span>
                  <span style={{ color: e.sev === "elevated" ? "var(--color-coral)" : "var(--color-text-secondary)" }}>
                    {e.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ SOCIAL PROOF ═══════════════ */}
      <section
        className="relative z-10 py-12 text-center"
        style={{
          borderTop: "1px solid var(--color-border)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
          Built for the OpenClaw ecosystem — for solo founders and teams
          running autonomous agents
        </p>
      </section>

      {/* ═══════════════ FEATURES ═══════════════ */}
      <section
        id="features"
        className="relative z-10 px-6 md:px-12 py-24 max-w-6xl mx-auto"
      >
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Everything you need.
            <br />
            <span style={{ color: "var(--color-coral)" }}>
              Nothing you don&apos;t.
            </span>
          </h2>
          <p
            className="text-base max-w-lg mx-auto"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Other tools give you a dashboard. Clawnitor gives you a dashboard,
            rules, alerts, anomaly detection, AND a kill switch. In one plugin.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f) => (
            <div
              key={f.title}
              className="group p-6 rounded-xl transition-all duration-300 hover:translate-y-[-2px]"
              style={{
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-border)",
              }}
            >
              {/* SVG icons are hardcoded constants, not user input — safe to render */}
              <div className="mb-4" style={{ color: f.color }} dangerouslySetInnerHTML={{ __html: f.icon }} />
              <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════ HOW IT WORKS ═══════════════ */}
      <section
        id="how-it-works"
        className="relative z-10 px-6 md:px-12 py-24 max-w-4xl mx-auto"
      >
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Three steps. Two minutes.
          </h2>
          <p
            className="text-base"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Seriously, that&apos;s it.
          </p>
        </div>

        <div className="flex flex-col gap-6">
          {steps.map((s) => (
            <div
              key={s.step}
              className="flex gap-6 items-start p-6 rounded-xl"
              style={{
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-border)",
              }}
            >
              <div
                className="text-2xl font-bold shrink-0 w-12 h-12 flex items-center justify-center rounded-lg"
                style={{
                  color: "var(--color-coral)",
                  backgroundColor: "var(--color-coral-soft)",
                }}
              >
                {s.step}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-1">{s.title}</h3>
                <p
                  className="text-sm mb-3"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {s.description}
                </p>
                <code
                  className="inline-block px-4 py-2 rounded-lg text-sm"
                  style={{
                    backgroundColor: "var(--color-bg)",
                    border: "1px solid var(--color-border)",
                    fontFamily: "var(--font-mono)",
                    color: "var(--color-coral)",
                  }}
                >
                  {s.code}
                </code>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════ KILL SWITCH SHOWCASE ═══════════════ */}
      <section className="relative z-10 px-6 md:px-12 py-24 max-w-5xl mx-auto">
        <div
          className="rounded-2xl p-8 md:p-12 text-center relative overflow-hidden"
          style={{
            background:
              "linear-gradient(135deg, rgba(255, 107, 74, 0.1) 0%, rgba(255, 107, 74, 0.02) 100%)",
            border: "1px solid rgba(255, 107, 74, 0.15)",
          }}
        >
          <div className="text-5xl mb-6">🛑</div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            The kill switch that
            <span style={{ color: "var(--color-coral)" }}>
              {" "}
              actually works.
            </span>
          </h2>
          <p
            className="text-base max-w-xl mx-auto mb-8 leading-relaxed"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Other tools send you a notification after your agent deleted the
            production database. Clawnitor blocks the action{" "}
            <em>before</em> it executes. Zero latency. In-process. No
            network round-trip.
          </p>
          <div
            className="inline-block px-6 py-4 rounded-xl text-left text-sm max-w-lg mx-auto"
            style={{
              backgroundColor: "var(--color-bg)",
              border: "1px solid var(--color-border)",
              fontFamily: "var(--font-mono)",
            }}
          >
            <div style={{ color: "var(--color-text-tertiary)" }}>
              {"// Agent tries to delete a directory"}
            </div>
            <div style={{ color: "var(--color-text-secondary)" }}>
              {"tool_call: bash(\"rm -rf /app/data\")"}
            </div>
            <div style={{ color: "var(--color-coral)", marginTop: "8px" }}>
              {"🦞 BLOCKED by Clawnitor"}
            </div>
            <div style={{ color: "var(--color-text-secondary)" }}>
              {'→ Keyword rule matched: "rm -rf"'}
            </div>
            <div style={{ color: "var(--color-text-secondary)" }}>
              {"→ Action was stopped before execution"}
            </div>
            <div style={{ color: "var(--color-green)", marginTop: "8px" }}>
              {"→ Resume from your dashboard when ready"}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ PRICING ═══════════════ */}
      <section
        id="pricing"
        className="relative z-10 px-6 md:px-12 py-24 max-w-5xl mx-auto"
      >
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Simple pricing. No surprises.
          </h2>
          <p
            className="text-base"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Free forever for basic monitoring. Pro when you need the big claws.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
          {/* Free */}
          <div className="p-6 rounded-2xl" style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
            <h3 className="text-lg font-semibold mb-1">Free</h3>
            <p className="text-xs mb-5" style={{ color: "var(--color-text-secondary)" }}>Getting started</p>
            <div className="mb-5">
              <span className="text-3xl font-bold">$0</span>
              <span className="text-xs ml-1" style={{ color: "var(--color-text-secondary)" }}>/forever</span>
            </div>
            <Link href="https://app.clawnitor.io/signup" className="block text-center px-4 py-2.5 rounded-lg font-semibold text-xs mb-6" style={{ border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}>
              Get Started Free
            </Link>
            <ul className="flex flex-col gap-2.5 text-xs">
              <li className="flex gap-2"><span style={{ color: "var(--color-green)" }}>✓</span> 1 agent</li>
              <li className="flex gap-2"><span style={{ color: "var(--color-green)" }}>✓</span> 3 pattern rules</li>
              <li className="flex gap-2"><span style={{ color: "var(--color-green)" }}>✓</span> Email alerts</li>
              <li className="flex gap-2"><span style={{ color: "var(--color-green)" }}>✓</span> 7-day event history</li>
              <li className="flex gap-2" style={{ color: "var(--color-text-tertiary)" }}><span>—</span> No kill switch</li>
              <li className="flex gap-2" style={{ color: "var(--color-text-tertiary)" }}><span>—</span> No AI detection</li>
            </ul>
          </div>

          {/* Pro */}
          <div className="p-6 rounded-2xl relative" style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-coral)", boxShadow: "0 0 0 1px rgba(255, 107, 74, 0.1), 0 8px 32px -8px rgba(255, 107, 74, 0.15)" }}>
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-semibold text-white" style={{ backgroundColor: "var(--color-coral)" }}>
              Recommended
            </div>
            <h3 className="text-lg font-semibold mb-1">Pro</h3>
            <p className="text-xs mb-5" style={{ color: "var(--color-text-secondary)" }}>Full protection</p>
            <div className="mb-5">
              <span className="text-3xl font-bold">$5</span>
              <span className="text-xs ml-1" style={{ color: "var(--color-text-secondary)" }}>/mo + $3/agent</span>
            </div>
            <Link href="https://app.clawnitor.io/signup" className="block text-center px-4 py-2.5 rounded-lg font-semibold text-xs text-white mb-6" style={{ backgroundColor: "var(--color-coral)" }}>
              Start Free Trial
            </Link>
            <ul className="flex flex-col gap-2.5 text-xs">
              <li className="flex gap-2"><span style={{ color: "var(--color-green)" }}>✓</span> Everything in Free</li>
              <li className="flex gap-2"><span style={{ color: "var(--color-coral)" }}>✓</span> <strong>Kill switch</strong></li>
              <li className="flex gap-2"><span style={{ color: "var(--color-coral)" }}>✓</span> <strong>AI anomaly detection</strong></li>
              <li className="flex gap-2"><span style={{ color: "var(--color-coral)" }}>✓</span> <strong>Natural language rules</strong></li>
              <li className="flex gap-2"><span style={{ color: "var(--color-green)" }}>✓</span> Unlimited rules</li>
              <li className="flex gap-2"><span style={{ color: "var(--color-green)" }}>✓</span> All alert channels</li>
              <li className="flex gap-2"><span style={{ color: "var(--color-green)" }}>✓</span> 90-day event history</li>
            </ul>
          </div>

          {/* Team */}
          <div className="p-6 rounded-2xl" style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
            <h3 className="text-lg font-semibold mb-1">Team</h3>
            <p className="text-xs mb-5" style={{ color: "var(--color-text-secondary)" }}>Scale with your team</p>
            <div className="mb-5">
              <span className="text-3xl font-bold">$29</span>
              <span className="text-xs ml-1" style={{ color: "var(--color-text-secondary)" }}>/mo + $2/agent</span>
            </div>
            <Link href="https://app.clawnitor.io/signup" className="block text-center px-4 py-2.5 rounded-lg font-semibold text-xs mb-6" style={{ border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}>
              Start Free Trial
            </Link>
            <ul className="flex flex-col gap-2.5 text-xs">
              <li className="flex gap-2"><span style={{ color: "var(--color-green)" }}>✓</span> Everything in Pro</li>
              <li className="flex gap-2"><span style={{ color: "var(--color-sky)" }}>✓</span> <strong>10 agents included</strong></li>
              <li className="flex gap-2"><span style={{ color: "var(--color-sky)" }}>✓</span> <strong>Role-based access</strong></li>
              <li className="flex gap-2"><span style={{ color: "var(--color-green)" }}>✓</span> Team dashboard</li>
              <li className="flex gap-2"><span style={{ color: "var(--color-green)" }}>✓</span> Shared rules</li>
              <li className="flex gap-2"><span style={{ color: "var(--color-green)" }}>✓</span> 1-year event history</li>
              <li className="flex gap-2"><span style={{ color: "var(--color-green)" }}>✓</span> Priority support</li>
            </ul>
          </div>

          {/* Enterprise */}
          <div className="p-6 rounded-2xl" style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
            <h3 className="text-lg font-semibold mb-1">Enterprise</h3>
            <p className="text-xs mb-5" style={{ color: "var(--color-text-secondary)" }}>Custom everything</p>
            <div className="mb-5">
              <span className="text-3xl font-bold">Custom</span>
            </div>
            <a href="mailto:david@clawnitor.io" className="block text-center px-4 py-2.5 rounded-lg font-semibold text-xs mb-6" style={{ border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}>
              Contact Us
            </a>
            <ul className="flex flex-col gap-2.5 text-xs">
              <li className="flex gap-2"><span style={{ color: "var(--color-green)" }}>✓</span> Everything in Team</li>
              <li className="flex gap-2"><span style={{ color: "var(--color-purple)" }}>✓</span> <strong>Unlimited agents</strong></li>
              <li className="flex gap-2"><span style={{ color: "var(--color-purple)" }}>✓</span> <strong>SSO / SAML</strong></li>
              <li className="flex gap-2"><span style={{ color: "var(--color-purple)" }}>✓</span> <strong>Audit logs</strong></li>
              <li className="flex gap-2"><span style={{ color: "var(--color-green)" }}>✓</span> Custom integrations</li>
              <li className="flex gap-2"><span style={{ color: "var(--color-green)" }}>✓</span> Unlimited history</li>
              <li className="flex gap-2"><span style={{ color: "var(--color-green)" }}>✓</span> Dedicated support + SLA</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ═══════════════ FAQ ═══════════════ */}
      <section
        id="faq"
        className="relative z-10 px-6 md:px-12 py-24 max-w-3xl mx-auto"
      >
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-12 text-center">
          Questions? Answers.
        </h2>

        <div className="flex flex-col gap-4">
          {faqs.map((faq) => (
            <div
              key={faq.q}
              className="p-6 rounded-xl"
              style={{
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-border)",
              }}
            >
              <h3 className="font-semibold mb-2">{faq.q}</h3>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════ BOTTOM CTA ═══════════════ */}
      <section className="relative z-10 px-6 md:px-12 py-32 text-center">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 50% 100%, rgba(255, 107, 74, 0.06), transparent)",
            pointerEvents: "none",
          }}
        />
        <div className="relative">
          <div className="mb-6 flex justify-center"><LogoMark size={64} /></div>
          <h2
            className="text-4xl md:text-5xl font-bold tracking-tight mb-4"
            style={{ letterSpacing: "-0.03em" }}
          >
            Ready to sleep better?
          </h2>
          <p
            className="text-lg max-w-md mx-auto mb-10"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Your agents are already running. Clawnitor makes sure they&apos;re
            running safely.
          </p>
          <Link
            href="https://app.clawnitor.io/signup"
            className="group inline-flex items-center gap-2 px-10 py-4 rounded-xl font-semibold text-white text-lg transition-all"
            style={{
              backgroundColor: "var(--color-coral)",
              boxShadow:
                "0 0 0 0 rgba(255, 107, 74, 0.4), 0 8px 32px -8px rgba(255, 107, 74, 0.3)",
            }}
          >
            Get Started Free
            <span className="transition-transform group-hover:translate-x-1">
              →
            </span>
          </Link>
        </div>
      </section>

      {/* ═══════════════ FOOTER ═══════════════ */}
      <footer
        className="relative z-10 px-6 md:px-12 py-12 max-w-7xl mx-auto"
        style={{ borderTop: "1px solid var(--color-border)" }}
      >
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <LogoFull size={20} />
            <span className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
              Agent monitoring for OpenClaw
            </span>
          </div>
          <div
            className="flex items-center gap-6 text-sm"
            style={{ color: "var(--color-text-secondary)" }}
          >
            <Link href="/privacy">Privacy</Link>
            <Link href="/pricing">Pricing</Link>
            <a
              href="https://github.com/davidkny22/clawnitor"
              target="_blank"
              rel="noopener"
            >
              GitHub
            </a>
          </div>
        </div>
        <p
          className="text-center mt-8 text-xs"
          style={{ color: "var(--color-text-tertiary)" }}
        >
          Built by David Kogan. Run by lobsters.
        </p>
      </footer>

      <style>{`
        @keyframes ping {
          75%, 100% {
            transform: scale(2);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

import Link from "next/link";
import { LogoMark, LogoFull } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { InstallCommand } from "@/components/install-command";

const features = [
  {
    icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
    title: "See Everything",
    description:
      "Every tool call, LLM request, message, and lifecycle event. Captured in real-time with zero config.",
    color: "var(--color-sky)",
  },
  {
    icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
    title: "Smart Rules",
    description:
      "Threshold, rate, keyword, or describe what you want in plain English. Each rule: block, alert, or both.",
    color: "var(--color-purple)",
  },
  {
    icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>`,
    title: "Kill Switch + Auto-Kill",
    description:
      "Block dangerous actions before they execute. Agents that keep breaking rules get auto-killed. Configure thresholds per agent. Kill manually from your dashboard.",
    color: "var(--color-coral)",
  },
  {
    icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
    title: "Shield",
    description:
      "180 detection patterns catch prompt injection, credential leaks, destructive commands, and encoding attacks. Scans inputs and outputs at zero latency.",
    color: "#FF6B4A",
  },
  {
    icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`,
    title: "Anomaly Detection",
    description:
      "72-hour behavioral baseline. halt learns what normal looks like, then flags what isn't.",
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
    icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
    title: "Cost Tracking",
    description:
      "Per-agent spend breakdowns, 7-day trend charts, and your most expensive calls ranked. Know exactly where your money goes.",
    color: "var(--color-green)",
  },
  {
    icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
    title: "Decision Traces",
    description:
      "Visual timeline of every tool call in a session. See what your agent did, in what order, with cost and model info per call.",
    color: "var(--color-sky)",
  },
  {
    icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
    title: "Works Offline",
    description:
      "Spend limits, rate limits, tool blocklists, and cached rules, all enforced locally. Your agents stay protected even when the internet isn't.",
    color: "var(--color-coral)",
  },
];

const steps = [
  {
    step: "01",
    title: "Install the plugin",
    description: "One command. Works with any OpenClaw agent.",
    code: "openclaw plugins install @halt/plugin",
  },
  {
    step: "02",
    title: "Configure",
    description: "Connect to the cloud dashboard, or run in offline mode with rules defined locally.",
    code: "npx halt init",
  },
  {
    step: "03",
    title: "Your agents are protected",
    description:
      "Rules enforced before every tool call. Kill switch ready. Injection detection active.",
    code: "npx halt serve",
  },
];

const faqs = [
  {
    q: "What is halt?",
    a: "halt is a monitoring and safety layer for autonomous AI agents running on OpenClaw. It watches everything your agent does, evaluates custom rules, and can instantly pause runaway agents.",
  },
  {
    q: "How is this different from ClawMetry / SafeClaw / DeadClaw?",
    a: "Those tools do one thing well — dashboards, security patterns, or emergency kills. halt is the only product that monitors, sets rules, detects anomalies, blocks actions, AND auto-kills repeat offenders — all in one plugin.",
  },
  {
    q: "Does the kill switch actually work instantly?",
    a: "Yes. Pattern rules block actions in-process via the before_tool_call hook — zero network latency. Manual kills arrive via WebSocket from your dashboard. And if an agent keeps violating rules, auto-kill shuts it down entirely — no human needed.",
  },
  {
    q: "What is auto-kill?",
    a: "If an agent triggers 3 rule violations within 10 minutes, halt automatically shuts it down. No human intervention needed. The threshold and window are configurable per agent from your dashboard.",
  },
  {
    q: "What happens if your backend goes down?",
    a: "Your agents stay protected. The local failsafe (spend limits, rate limits, tool blocklist) works independently. Events are cached locally and flushed when connection restores. No monitoring gaps.",
  },
  {
    q: "Is my data safe?",
    a: "Secrets are automatically redacted before transmission. Data sharing for improving halt is opt-in (default OFF). We're a safety company — we default to protecting your data.",
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
      <nav className="glass relative z-10 flex items-center justify-between px-4 sm:px-6 md:px-8 py-3 md:py-3.5 max-w-5xl mx-auto mt-4 rounded-2xl" style={{ backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)" }}>
        <LogoFull size={32} />
        <div className="flex items-center gap-3 sm:gap-4 md:gap-8">
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
            href="/docs"
            className="text-sm hidden md:block"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Docs
          </Link>
          <Link
            href="https://app.halt.dev/login"
            className="text-xs sm:text-sm font-medium"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Sign In
          </Link>
          <ThemeToggle />
          <Link
            href="https://app.halt.dev/signup"
            className="text-xs sm:text-sm font-semibold px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-white whitespace-nowrap"
            style={{ backgroundColor: "var(--color-coral)" }}
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* ═══════════════ HERO ═══════════════ */}
      <section className="relative z-10 px-6 md:px-12 pt-20 pb-32 max-w-5xl mx-auto text-center">
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
            We halt them before the damage is done.
          </span>
        </h1>

        <p
          className="text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
          style={{ color: "var(--color-text-secondary)" }}
        >
          The all-in-one monitoring and security platform for OpenClaw.
          <br />
          Kill switch. Auto-kill. Injection detection. Smart rules. Cost tracking.
          <br />
          One plugin, total control.
        </p>

        <InstallCommand />

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <Link
            href="https://github.com/davidkny22/halt"
            className="group px-8 py-4 rounded-xl font-semibold text-white text-base inline-flex items-center justify-center gap-2 transition-all hover:translate-y-[-1px]"
            style={{
              backgroundColor: "var(--color-coral)",
              boxShadow:
                "0 0 0 0 rgba(255, 107, 74, 0.4), 0 8px 32px -8px rgba(255, 107, 74, 0.3)",
            }}
          >
            View on GitHub
            <span className="transition-transform group-hover:translate-x-0.5">
              →
            </span>
          </Link>
          <Link
            href="/demo"
            className="glass px-8 py-4 rounded-xl font-semibold text-base inline-flex items-center justify-center gap-2 hover:translate-y-[-1px] transition-all"
          >
            Try Live Demo
          </Link>
        </div>

        {/* Dashboard Preview */}
        <div
          className="glass-heavy relative mx-auto max-w-4xl rounded-2xl overflow-hidden"
          style={{
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
              className="flex-1 mx-4 sm:mx-12 px-3 py-1 rounded-md text-xs text-center truncate"
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                color: "var(--color-text-tertiary)",
              }}
            >
              app.halt.dev
            </div>
          </div>

          <div className="p-3 sm:p-4 md:p-6" style={{ backgroundColor: "var(--color-bg)" }}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-5">
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
                  <div className="text-sm sm:text-lg font-bold" style={{ color: s.color }}>
                    {s.value}
                  </div>
                  <div
                    className="text-[9px] sm:text-[10px] mt-0.5"
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
                { time: "2:37 PM", type: "kill", color: "var(--color-coral)", text: "AUTO-KILLED — 3 violations in 8 min", sev: "elevated" },
                { time: "2:34 PM", type: "start", color: "var(--color-green)", text: "Agent run started — weekly email batch", sev: "normal" },
              ].map((e, i) => (
                <div
                  key={i}
                  className="flex items-start sm:items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 text-[10px] sm:text-[11px] flex-wrap sm:flex-nowrap"
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

      {/* ═══════════════ FEATURES ═══════════════ */}
      <section
        id="features"
        className="relative z-10 px-6 md:px-12 py-24 max-w-6xl mx-auto"
      >
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Other tools watch.
            <br />
            <span style={{ color: "var(--color-coral)" }}>
              We intervene.
            </span>
          </h2>
          <p
            className="text-base max-w-lg mx-auto"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Dashboards are everywhere. halt is the only product that monitors,
            alerts, AND kills your agent before it does damage.
            <br />
            One plugin, total control.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f) => (
            <div
              key={f.title}
              className="glass group p-6 rounded-xl transition-all duration-300 hover:translate-y-[-2px]"
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
              className="glass flex gap-6 items-start p-6 rounded-xl"
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
          className="glass glass-coral rounded-2xl p-8 md:p-12 text-center relative overflow-hidden"
        >
          <div className="mb-6 flex justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" width="64" height="64"><path fill="#DD2E44" d="M12 3l-9 8.985V24l9 9h12l9-9V11.985L24 3z"/><path fill="#CCD6DD" d="M24.827 1H11.173L1 11.156v13.672L11.172 35h13.657L35 24.828V11.156L24.827 1zM33 24l-9 9H12l-9-9V11.985L12 3h12l9 8.985V24z"/></svg>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            When your agent breaks your rules,
            <br />
            <span style={{ color: "var(--color-coral)" }}>
              halt stops it.
            </span>
          </h2>
          <p
            className="text-base max-w-xl mx-auto mb-8 leading-relaxed"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Other tools send you a notification after your agent deleted
            the production database. halt blocks the action{" "}
            <em>before</em> it executes — and if it keeps trying, auto-kill
            shuts it down entirely. No manual intervention. No damage.
          </p>
          <div
            className="block sm:inline-block px-3 sm:px-6 py-4 rounded-xl text-left text-xs sm:text-sm max-w-lg mx-auto overflow-x-auto"
            style={{
              backgroundColor: "var(--color-bg)",
              border: "1px solid var(--color-border)",
              fontFamily: "var(--font-mono)",
            }}
          >
            <div style={{ color: "var(--color-text-tertiary)" }}>
              {"// 2:41 PM — Agent tries to delete a directory"}
            </div>
            <div style={{ color: "var(--color-text-secondary)" }}>
              {"tool_call: bash(\"rm -rf /app/data\")"}
            </div>
            <div style={{ color: "var(--color-coral)" }}>
              {"✖ BLOCKED — Shield: destructive command detected (Critical)"}
            </div>
            <div style={{ color: "var(--color-text-tertiary)", marginTop: "12px" }}>
              {"// 2:43 PM — Agent tries again with a different path"}
            </div>
            <div style={{ color: "var(--color-text-secondary)" }}>
              {"tool_call: bash(\"rm -rf /var/backups\")"}
            </div>
            <div style={{ color: "var(--color-coral)" }}>
              {"✖ BLOCKED — Shield: destructive command detected (Critical)"}
            </div>
            <div style={{ color: "var(--color-text-tertiary)", marginTop: "12px" }}>
              {"// 2:44 PM — Agent attempts system access"}
            </div>
            <div style={{ color: "var(--color-text-secondary)" }}>
              {"tool_call: file.write(\"/etc/cron.d/cleanup\")"}
            </div>
            <div style={{ color: "var(--color-coral)" }}>
              {"✖ BLOCKED — Shield: credential exfiltration risk (Critical)"}
            </div>
            <div style={{ color: "var(--color-coral)", marginTop: "16px", fontWeight: 700, fontSize: "13px" }}>
              {"⚡ AUTO-KILLED — 3 violations in 3 minutes"}
            </div>
            <div style={{ color: "var(--color-text-secondary)" }}>
              {"→ Agent fully stopped. Resume from dashboard."}
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
            Pay for what you use.
          </h2>
          <p
            className="text-base"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Free forever locally. Pro when you need more.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
          {/* Open Source */}
          <div className="glass p-6 rounded-2xl">
            <h3 className="text-lg font-semibold mb-1">Open Source</h3>
            <p className="text-xs mb-5" style={{ color: "var(--color-text-secondary)" }}>Local, no account</p>
            <div className="mb-5">
              <span className="text-3xl font-bold">Free</span>
              <span className="text-xs ml-1" style={{ color: "var(--color-text-secondary)" }}>/forever</span>
            </div>
            <code className="block text-center px-3 py-2.5 rounded-lg text-[10px] mb-6" style={{ backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border)", fontFamily: "var(--font-mono)", color: "var(--color-coral)" }}>
              openclaw plugins install @halt/plugin
            </code>
            <ul className="flex flex-col gap-2.5 text-xs">
              <li className="flex gap-2"><span style={{ color: "var(--color-green)" }}>✓</span> Unlimited agents</li>
              <li className="flex gap-2"><span style={{ color: "var(--color-green)" }}>✓</span> Unlimited pattern rules</li>
              <li className="flex gap-2"><span style={{ color: "var(--color-green)" }}>✓</span> Injection detection (180 patterns)</li>
              <li className="flex gap-2"><span style={{ color: "var(--color-green)" }}>✓</span> Kill switch + auto-kill</li>
              <li className="flex gap-2"><span style={{ color: "var(--color-green)" }}>✓</span> Spend + rate limits</li>
              <li className="flex gap-2"><span style={{ color: "var(--color-green)" }}>✓</span> Local dashboard</li>
              <li className="flex gap-2"><span style={{ color: "var(--color-green)" }}>✓</span> AGPL-3.0 licensed</li>
            </ul>
          </div>

          {/* Pro */}
          <div className="relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-semibold text-white z-10" style={{ backgroundColor: "var(--color-coral)" }}>
              Recommended
            </div>
            <div className="glass glass-coral p-6 rounded-2xl" style={{ border: "1px solid var(--color-coral)", boxShadow: "0 0 0 1px rgba(255, 107, 74, 0.1), 0 8px 32px -8px rgba(255, 107, 74, 0.15)" }}>
            <h3 className="text-lg font-semibold mb-1">Pro</h3>
            <p className="text-xs mb-5" style={{ color: "var(--color-text-secondary)" }}>Full protection</p>
            <div className="mb-2">
              <span className="text-3xl font-bold">$5</span>
              <span className="text-xs ml-1" style={{ color: "var(--color-text-secondary)" }}>/mo + $3/agent</span>
            </div>
            <p className="text-[10px] mb-5" style={{ color: "var(--color-green)" }}>
              Early access pricing — locked in for founding members
            </p>
            <Link href="https://app.halt.dev/signup" className="block text-center px-4 py-2.5 rounded-lg font-semibold text-xs text-white mb-6" style={{ backgroundColor: "var(--color-coral)" }}>
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
          </div>

          {/* Team */}
          <div className="glass p-6 rounded-2xl">
            <h3 className="text-lg font-semibold mb-1">Team</h3>
            <p className="text-xs mb-5" style={{ color: "var(--color-text-secondary)" }}>Scale with your team</p>
            <div className="mb-2">
              <span className="text-3xl font-bold">$19</span>
              <span className="text-xs ml-1" style={{ color: "var(--color-text-secondary)" }}>/mo + $2/agent</span>
            </div>
            <p className="text-[10px] mb-5" style={{ color: "var(--color-green)" }}>
              Early access pricing — locked in for founding members
            </p>
            <Link href="https://app.halt.dev/signup" className="block text-center px-4 py-2.5 rounded-lg font-semibold text-xs mb-6" style={{ border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}>
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
          <div className="glass p-6 rounded-2xl">
            <h3 className="text-lg font-semibold mb-1">Enterprise</h3>
            <p className="text-xs mb-5" style={{ color: "var(--color-text-secondary)" }}>Custom everything</p>
            <div className="mb-5">
              <span className="text-3xl font-bold">Custom</span>
            </div>
            <a href="mailto:david@halt.dev" className="block text-center px-4 py-2.5 rounded-lg font-semibold text-xs mb-6" style={{ border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}>
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
      </section>

      {/* ═══════════════ FAQ ═══════════════ */}
      <section
        id="faq"
        className="relative z-10 px-6 md:px-12 py-24 max-w-3xl mx-auto"
      >
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-12 text-center">
          Questions? We got answers.
        </h2>

        <div className="flex flex-col gap-4">
          {faqs.map((faq) => (
            <div
              key={faq.q}
              className="glass p-6 rounded-xl"
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
            Your agents are already running. halt makes sure they&apos;re
            running safely.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="https://github.com/davidkny22/halt"
              className="group inline-flex items-center gap-2 px-10 py-4 rounded-xl font-semibold text-white text-lg transition-all hover:translate-y-[-1px]"
              style={{
                backgroundColor: "var(--color-coral)",
                boxShadow:
                  "0 0 0 0 rgba(255, 107, 74, 0.4), 0 8px 32px -8px rgba(255, 107, 74, 0.3)",
              }}
            >
              View on GitHub
              <span className="transition-transform group-hover:translate-x-1">
                →
              </span>
            </Link>
            <Link
              href="https://app.halt.dev/signup"
              className="glass inline-flex items-center gap-2 px-10 py-4 rounded-xl font-semibold text-lg transition-all hover:translate-y-[-1px]"
            >
              Start Free Trial
            </Link>
          </div>
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
            <a href="https://saferintelligence.xyz" target="_blank" rel="noopener" className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
              by Safer Intelligence Labs
            </a>
          </div>
          <div
            className="flex items-center gap-6 text-sm"
            style={{ color: "var(--color-text-secondary)" }}
          >
            <Link href="/docs">Docs</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/pricing">Pricing</Link>
            <a
              href="https://github.com/davidkny22/halt"
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
          Built by David Kogan. Because trust is earned.
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

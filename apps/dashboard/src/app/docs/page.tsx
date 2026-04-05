import { LogoFull } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import Link from "next/link";

const sections = [
  { id: "quickstart", label: "Quick Start" },
  { id: "configuration", label: "Configuration" },
  { id: "monitoring", label: "Event Monitoring" },
  { id: "rules", label: "Rules & Alerts" },
  { id: "shield", label: "Shield" },
  { id: "kill-switch", label: "Kill Switch" },
  { id: "anomaly", label: "Anomaly Detection" },
  { id: "cost-tracking", label: "Cost Tracking" },
  { id: "decision-traces", label: "Decision Traces" },
  { id: "teams", label: "Teams" },
  { id: "offline", label: "Offline Resilience" },
  { id: "api", label: "API Reference" },
  { id: "pricing", label: "Pricing" },
  { id: "troubleshooting", label: "Troubleshooting" },
];

function Badge({ tier }: { tier: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    Pro: { bg: "rgba(255, 107, 74, 0.15)", text: "var(--color-coral)" },
    Team: { bg: "rgba(56, 189, 248, 0.15)", text: "var(--color-sky)" },
    Enterprise: { bg: "rgba(167, 139, 250, 0.15)", text: "var(--color-purple)" },
  };
  const c = colors[tier] || colors.Pro;
  return (
    <span
      className="text-[10px] font-semibold px-2 py-0.5 rounded-full ml-2 align-middle"
      style={{ backgroundColor: c.bg, color: c.text }}
    >
      {tier}
    </span>
  );
}

function Code({ children }: { children: string }) {
  return (
    <code
      className="text-sm px-1.5 py-0.5 rounded"
      style={{
        backgroundColor: "rgba(255, 107, 74, 0.1)",
        color: "var(--color-coral)",
        fontFamily: "var(--font-mono)",
      }}
    >
      {children}
    </code>
  );
}

function CodeBlock({ children, title }: { children: string; title?: string }) {
  return (
    <div
      className="rounded-lg overflow-hidden my-4"
      style={{ border: "1px solid var(--color-border)" }}
    >
      {title && (
        <div
          className="px-4 py-2 text-xs font-medium"
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.03)",
            borderBottom: "1px solid var(--color-border)",
            color: "var(--color-text-secondary)",
          }}
        >
          {title}
        </div>
      )}
      <pre
        className="p-4 text-sm overflow-x-auto"
        style={{
          backgroundColor: "var(--color-bg)",
          fontFamily: "var(--font-mono)",
          color: "var(--color-text-secondary)",
        }}
      >
        {children}
      </pre>
    </div>
  );
}

function SectionHeader({ id, children, badge }: { id: string; children: React.ReactNode; badge?: string }) {
  return (
    <h2 id={id} className="text-xl font-bold mt-16 mb-4 scroll-mt-24">
      {children}
      {badge && <Badge tier={badge} />}
    </h2>
  );
}

function SubHeader({ children }: { children: React.ReactNode }) {
  return <h3 className="text-base font-semibold mt-8 mb-3">{children}</h3>;
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--color-text-secondary)" }}>
      {children}
    </p>
  );
}

function ConfigRow({ name, type, def, children }: { name: string; type: string; def: string; children: React.ReactNode }) {
  return (
    <div
      className="flex flex-col gap-1 p-4"
      style={{ borderBottom: "1px solid var(--color-border)" }}
    >
      <div className="flex items-center gap-3">
        <Code>{name}</Code>
        <span className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>{type}</span>
        <span className="text-xs ml-auto" style={{ color: "var(--color-text-tertiary)" }}>
          {def === "required" ? (
            <span style={{ color: "var(--color-coral)" }}>required</span>
          ) : (
            <>default: {def}</>
          )}
        </span>
      </div>
      <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{children}</span>
    </div>
  );
}

export default function DocsPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--color-bg)" }}>
      {/* Nav */}
      <nav
        className="flex items-center justify-between px-6 py-4 sticky top-0 z-20"
        style={{
          borderBottom: "1px solid var(--color-border)",
          backgroundColor: "var(--color-bg)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div className="flex items-center gap-4">
          <Link href="/"><LogoFull size={22} /></Link>
          <span className="text-sm font-semibold" style={{ color: "var(--color-text-secondary)" }}>
            Docs
          </span>
        </div>
        <div className="flex items-center gap-6 text-sm" style={{ color: "var(--color-text-secondary)" }}>
          <Link href="/demo">Demo</Link>
          <Link href="/pricing">Pricing</Link>
          <ThemeToggle />
          <Link
            href="https://app.halt.dev/signup"
            className="font-semibold px-4 py-1.5 rounded-lg text-white"
            style={{ backgroundColor: "var(--color-coral)" }}
          >
            Get Started
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto flex gap-10 px-6 py-12">
        {/* Sidebar */}
        <aside className="hidden lg:block w-44 shrink-0">
          <nav className="sticky top-24 flex flex-col gap-1.5">
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="text-xs font-medium px-3 py-1.5 rounded-md transition-colors hover:opacity-80"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {s.label}
              </a>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0">
          <h1 className="text-3xl font-bold mb-2">halt documentation</h1>
          <P>
            Agent monitoring, smart rules, and a kill switch for OpenClaw.
            One plugin. Total control.
          </P>

          {/* ═══════════════ QUICK START ═══════════════ */}
          <SectionHeader id="quickstart">Quick Start</SectionHeader>
          <P>Get from zero to monitored in under 2 minutes.</P>

          <SubHeader>1. Install the plugin</SubHeader>
          <CodeBlock title="Terminal">{`openclaw plugins install @halt/plugin`}</CodeBlock>

          <SubHeader>2. Set up (one command)</SubHeader>
          <CodeBlock title="Terminal">{`npx halt init`}</CodeBlock>
          <P>
            This handles authentication, API key generation, and config in one command. Or manually: sign up at <a href="https://app.halt.dev/signup" style={{ color: "var(--color-coral)" }}>app.halt.dev</a>, copy your API key, and add it to your <Code>openclaw.json</Code>:
          </P>
          <CodeBlock title="openclaw.json">{`{
  "plugins": {
    "entries": {
      "halt": {
        "config": {
          "apiKey": "clw_live_your_key_here"
        }
      }
    }
  }
}`}</CodeBlock>

          <SubHeader>3. Agents are auto-discovered</SubHeader>
          <P>
            When the plugin starts, it reads your <Code>openclaw.json</Code> and registers all agents with halt. They appear on your{" "}
            <a href="https://app.halt.dev/agents" style={{ color: "var(--color-coral)" }}>agents page</a> as
            &ldquo;discovered&rdquo; — activate the ones you want to monitor.
          </P>
          <P>
            To register agents before running them:
          </P>
          <CodeBlock title="Terminal">{`npx halt discover`}</CodeBlock>

          {/* ═══════════════ CONFIGURATION ═══════════════ */}
          <SectionHeader id="configuration">Configuration</SectionHeader>
          <P>All configuration goes inside the <Code>config</Code> object in your <Code>openclaw.json</Code>.</P>

          <div
            className="rounded-lg overflow-hidden my-4"
            style={{ border: "1px solid var(--color-border)" }}
          >
            <ConfigRow name="apiKey" type="string" def="required">
              Your halt API key. Starts with <Code>clw_live_</Code>.
            </ConfigRow>
            <ConfigRow name="backendUrl" type="string" def="https://api.halt.dev">
              Backend API endpoint. Override for self-hosted or development.
            </ConfigRow>
            <ConfigRow name="spendLimit" type="number" def="100">
              Max spend per session in USD. Agent auto-pauses when this limit is reached.
            </ConfigRow>
            <ConfigRow name="rateLimit" type="number" def="120">
              Max tool calls per minute. Agent auto-pauses when this rate is exceeded.
            </ConfigRow>
            <ConfigRow name="toolBlocklist" type="string[]" def="[]">
              Tool names to always block. Case-insensitive. Example: <Code>{`["execute_bash", "rm"]`}</Code>
            </ConfigRow>
            <ConfigRow name="redactionPatterns" type="string[]" def="[]">
              Additional regex patterns for redacting sensitive data from event logs.
            </ConfigRow>
          </div>

          <CodeBlock title="Full example — openclaw.json">{`{
  "plugins": {
    "entries": {
      "halt": {
        "config": {
          "apiKey": "clw_live_abc123",
          "spendLimit": 50,
          "rateLimit": 60,
          "toolBlocklist": ["execute_bash", "delete_file"],
          "redactionPatterns": ["sk-[a-zA-Z0-9]{32}"]
        }
      }
    }
  }
}`}</CodeBlock>

          {/* ═══════════════ EVENT MONITORING ═══════════════ */}
          <SectionHeader id="monitoring">Event Monitoring</SectionHeader>
          <P>halt captures every action your agent takes through OpenClaw&apos;s hooks system.</P>

          <SubHeader>Event types</SubHeader>
          <div
            className="rounded-lg overflow-hidden my-4 text-xs"
            style={{ border: "1px solid var(--color-border)" }}
          >
            {[
              { type: "tool_use", hook: "before_tool_call / after_tool_call", desc: "Every tool invocation with name, params, result, duration" },
              { type: "llm_call", hook: "llm_input / llm_output", desc: "LLM requests with token count, cost, model name" },
              { type: "message_sent", hook: "message_sending / message_sent", desc: "Outbound messages from the agent" },
              { type: "message_received", hook: "message_received", desc: "Inbound messages to the agent" },
              { type: "agent_lifecycle", hook: "session_start / session_end / agent_end", desc: "Session and agent lifecycle events" },
              { type: "subagent", hook: "subagent_spawning / subagent_ended", desc: "Sub-agent creation and completion" },
            ].map((e) => (
              <div
                key={e.type}
                className="flex items-start gap-4 px-4 py-3"
                style={{ borderBottom: "1px solid var(--color-border)" }}
              >
                <Code>{e.type}</Code>
                <span className="flex-1" style={{ color: "var(--color-text-secondary)" }}>{e.desc}</span>
              </div>
            ))}
          </div>

          <SubHeader>Privacy</SubHeader>
          <P>
            Sensitive data (API keys, passwords, tokens) is automatically redacted before transmission.
            Data sharing for aggregate pattern improvement is opt-in and off by default.
          </P>

          {/* ═══════════════ RULES & ALERTS ═══════════════ */}
          <SectionHeader id="rules">Rules &amp; Alerts</SectionHeader>
          <P>
            Rules evaluate against incoming events and trigger alerts or block actions.
            Free tier gets 3 pattern rules. Paid tiers get unlimited rules including natural language.
          </P>

          <SubHeader>Rule types</SubHeader>

          <div className="flex flex-col gap-4 my-4">
            {[
              {
                name: "Keyword",
                desc: "Match actions containing specific strings. Block, alert, or both. Case-insensitive by default.",
                example: `{ "type": "keyword", "keywords": ["rm -rf", "DROP TABLE"], "matchMode": "any" }`,
                tier: null,
              },
              {
                name: "Rate",
                desc: "Alert or block when event frequency exceeds a threshold in a time window.",
                example: `{ "type": "rate", "eventType": "tool_use", "maxCount": 20, "windowMinutes": 5 }`,
                tier: null,
              },
              {
                name: "Threshold",
                desc: "Alert or block when a numeric field crosses a limit in a time window.",
                example: `{ "type": "threshold", "field": "cost_usd", "operator": "gt", "value": 10, "windowMinutes": 60 }`,
                tier: null,
              },
              {
                name: "Natural Language",
                desc: "Describe what to monitor in plain English. Block, alert, or both. Evaluated by AI.",
                example: `{ "type": "nl", "promptText": "Block any action that sends emails to more than 10 recipients" }`,
                tier: "Pro",
              },
            ].map((r) => (
              <div
                key={r.name}
                className="p-4 rounded-lg"
                style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
              >
                <div className="font-semibold text-sm mb-1">
                  {r.name}
                  {r.tier && <Badge tier={r.tier} />}
                </div>
                <p className="text-xs mb-3" style={{ color: "var(--color-text-secondary)" }}>{r.desc}</p>
                <CodeBlock>{r.example}</CodeBlock>
              </div>
            ))}
          </div>

          <SubHeader>Per-agent scoping</SubHeader>
          <P>
            Rules can apply to all agents (default) or be scoped to specific agents. Set the scope when creating a rule — select &ldquo;All agents&rdquo; or pick specific agents. The plugin only fetches rules relevant to its agent, so scoped rules never fire on the wrong agent.
          </P>

          <SubHeader>Agent-visible rules</SubHeader>
          <P>
            Rules can be visible or silent. Visible rules are injected into the agent&apos;s system prompt so it knows what&apos;s being enforced and can comply proactively. Silent rules enforce without the agent&apos;s knowledge. Set per-rule when creating, or override system-wide from Settings (All visible / Per rule / All silent).
          </P>

          <SubHeader>Alert channels</SubHeader>
          <P>
            Free tier: email only. Paid tiers: email, Telegram, Discord, and SMS.
            Enterprise adds custom webhooks with HMAC-SHA256 signing.
          </P>

          {/* ═══════════════ KILL SWITCH ═══════════════ */}
          <SectionHeader id="shield">Shield <Badge tier="Pro" /></SectionHeader>
          <p>Built-in injection detection engine that scans both tool inputs (before execution) and tool outputs (after execution). 140 detection patterns across 6 categories, 3 severity tiers. Zero latency — pure pattern matching, no API calls.</p>

          <h3 className="text-base font-semibold mt-6 mb-2" style={{ color: "var(--color-text)" }}>Detection Categories</h3>
          <ul className="list-disc pl-5 flex flex-col gap-1.5">
            <li><strong style={{ color: "#ef4444" }}>Critical (always blocked):</strong> Destructive commands (rm -rf, DROP TABLE, curl|bash), credential exfiltration (AWS keys, GitHub tokens, Stripe keys, JWTs, private keys, 30+ service-specific patterns)</li>
            <li><strong style={{ color: "var(--color-coral)" }}>High (block by default):</strong> Prompt injection (instruction overrides, system prompt manipulation, jailbreaks, stealth patterns like &quot;do not tell the user&quot;, multi-turn manipulation)</li>
            <li><strong style={{ color: "#f59e0b" }}>Medium (alert by default):</strong> Encoding tricks (zero-width chars, homoglyphs, RTL overrides), data exfiltration (PII in outputs, crypto addresses, healthcare IDs)</li>
          </ul>

          <h3 className="text-base font-semibold mt-6 mb-2" style={{ color: "var(--color-text)" }}>How It Works</h3>
          <p>Shield runs as a standalone scanner in the plugin hook chain, before cached rules. It scans tool parameters on every call, and tool results after execution (catching indirect injection from RAG, APIs, and databases).</p>
          <p className="mt-2">Pro+ users get three Shield rules auto-enabled on signup. Critical threats cannot be downgraded. High and medium tiers are configurable — set to block or alert per your preference. Per-tool allowlists prevent false positives on known-safe tools.</p>

          <h3 className="text-base font-semibold mt-6 mb-2" style={{ color: "var(--color-text)" }}>Output Scanning</h3>
          <p>Shield is the only agent monitoring tool that scans tool outputs at the plugin level. This catches indirect prompt injection — malicious instructions hiding in API responses, database results, or RAG documents. Output detections trigger alerts and feed into auto-kill escalation.</p>

          <SectionHeader id="kill-switch">Kill Switch</SectionHeader>
          <P>
            Three layers of pre-action defense. Every tool call and message is checked before execution.
            If any layer triggers, the action is blocked in-process with zero network latency.
          </P>

          <div className="flex flex-col gap-3 my-4">
            {[
              {
                layer: "1",
                name: "Server Kill State",
                desc: "Click \"Kill\" in your dashboard. A WebSocket signal reaches the plugin instantly. All subsequent actions are blocked until you resume.",
              },
              {
                layer: "2",
                name: "Local Failsafe",
                desc: "Spend circuit breaker, rate limiter, and tool blocklist. Always active, even when offline. Configured via your openclaw.json.",
              },
              {
                layer: "3",
                name: "Cached Rule Evaluation",
                desc: "Your server-side rules are fetched every 60 seconds and evaluated locally. Keyword, rate, and threshold rules run pre-action without a network round-trip.",
              },
            ].map((l) => (
              <div
                key={l.layer}
                className="flex gap-4 p-4 rounded-lg"
                style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
              >
                <span
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0"
                  style={{ backgroundColor: "var(--color-coral-soft)", color: "var(--color-coral)" }}
                >
                  {l.layer}
                </span>
                <div>
                  <div className="font-semibold text-sm mb-1">{l.name}</div>
                  <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{l.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ═══════════════ ANOMALY DETECTION ═══════════════ */}
          <SectionHeader id="anomaly" badge="Pro">Anomaly Detection</SectionHeader>
          <P>
            halt builds a 72-hour behavioral baseline for each agent — typical event rates, tool usage
            patterns, cost per session. After the learning period, it flags deviations automatically.
          </P>
          <P>
            No configuration needed. Baselines are built from your agent&apos;s actual behavior, not generic thresholds.
          </P>

          {/* ═══════════════ COST TRACKING ═══════════════ */}
          <SectionHeader id="cost-tracking">Cost Tracking</SectionHeader>
          <P>
            Every LLM call and tool use captures cost data from OpenClaw&apos;s native tracking. halt
            aggregates this into actionable spend analytics on your dashboard:
          </P>
          <ul className="text-xs flex flex-col gap-2 mb-4 ml-4" style={{ color: "var(--color-text-secondary)" }}>
            <li><strong style={{ color: "var(--color-text)" }}>Per-agent cost cards</strong> — see which agents cost the most, with token counts and event volume</li>
            <li><strong style={{ color: "var(--color-text)" }}>7-day spend chart</strong> — daily trend visualization with week-over-week comparison</li>
            <li><strong style={{ color: "var(--color-text)" }}>Top costly events</strong> — your 10 most expensive individual calls ranked, with model and timestamp</li>
            <li><strong style={{ color: "var(--color-text)" }}>Spend today + trend</strong> — stats row shows today&apos;s spend with a percentage change arrow</li>
          </ul>
          <P>
            Cost data comes from OpenClaw&apos;s native <Code>cost_usd</Code> and <Code>tokens_used</Code> fields
            in event metadata. halt does not calculate costs — it uses what OpenClaw reports.
          </P>

          {/* ═══════════════ DECISION TRACES ═══════════════ */}
          <SectionHeader id="decision-traces">Decision Traces</SectionHeader>
          <P>
            On each agent&apos;s detail page, you can see a visual timeline of recent sessions. Click any
            session to expand its full decision trace — every tool call, LLM request, and message in order.
          </P>
          <ul className="text-xs flex flex-col gap-2 mb-4 ml-4" style={{ color: "var(--color-text-secondary)" }}>
            <li><strong style={{ color: "var(--color-text)" }}>Session cards</strong> — date, duration, event count, total cost per session</li>
            <li><strong style={{ color: "var(--color-text)" }}>Expandable timeline</strong> — color-coded dots per event type (tool=sky, LLM=purple, message=green, subagent=yellow)</li>
            <li><strong style={{ color: "var(--color-text)" }}>Per-call detail</strong> — action name, target, model, cost, severity highlighting</li>
            <li><strong style={{ color: "var(--color-text)" }}>Subagent attribution</strong> — subagent lifecycle events show their ID with indented positioning</li>
          </ul>
          <P>
            Navigate to <strong>Agents</strong> → click an agent → <strong>Sessions</strong> tab.
            Sessions are tracked with full lifecycle (active, completed, killed) including duration,
            event count, and cost. Subagent events are nested within their parent session.
            Blocked events show a BLOCKED badge with the reason and source rule.
          </P>

          {/* ═══════════════ TEAMS ═══════════════ */}
          <SectionHeader id="teams" badge="Team">Teams</SectionHeader>
          <P>
            Free tier includes 1 team with 2 members. Team tier scales to 10 members with full role
            management (owner, admin, editor, viewer) and unlimited shared rules.
          </P>
          <P>
            Shared rules apply across all team members&apos; agents. Invite members via email — invitations expire after 7 days.
          </P>

          {/* ═══════════════ OFFLINE RESILIENCE ═══════════════ */}
          <SectionHeader id="offline">Offline Resilience</SectionHeader>
          <P>
            If the halt backend is unreachable, the plugin keeps working:
          </P>
          <ul className="text-xs flex flex-col gap-2 mb-4 ml-4" style={{ color: "var(--color-text-secondary)" }}>
            <li>Events are cached locally (up to 50MB / 7 days)</li>
            <li>Local failsafe (spend limits, rate limits, tool blocklist) stays active</li>
            <li>Cached rules continue evaluating pre-action</li>
            <li>On reconnect, queued events flush automatically</li>
          </ul>
          <P>Your agents stay protected even when the internet isn&apos;t.</P>

          {/* ═══════════════ API REFERENCE ═══════════════ */}
          <SectionHeader id="api">API Reference</SectionHeader>
          <P>
            All API endpoints require a Bearer token (<Code>Authorization: Bearer clw_live_...</Code>)
            unless marked as public.
          </P>

          <div
            className="rounded-lg overflow-hidden my-4 text-xs"
            style={{ border: "1px solid var(--color-border)" }}
          >
            {[
              { method: "POST", path: "/api/events", desc: "Ingest batch of events (up to 100)" },
              { method: "GET", path: "/api/events", desc: "List events with pagination" },
              { method: "GET", path: "/api/agents", desc: "List all agents" },
              { method: "POST", path: "/api/agents", desc: "Create agent" },
              { method: "GET", path: "/api/rules", desc: "List rules" },
              { method: "POST", path: "/api/rules", desc: "Create rule" },
              { method: "PUT", path: "/api/rules/:id", desc: "Update rule" },
              { method: "DELETE", path: "/api/rules/:id", desc: "Delete rule" },
              { method: "GET", path: "/api/alerts", desc: "List alerts" },
              { method: "POST", path: "/api/agents/:id/kill", desc: "Kill (pause) agent" },
              { method: "POST", path: "/api/agents/:id/resume", desc: "Resume agent" },
              { method: "GET", path: "/api/stats", desc: "Dashboard stats" },
              { method: "GET", path: "/api/tools", desc: "Known tools (discovered from config + seen in events)" },
              { method: "GET", path: "/api/spend", desc: "Spend analytics (per-agent, per-day, top events)" },
              { method: "GET", path: "/api/sessions", desc: "List sessions (filter by agent, status)" },
              { method: "GET", path: "/api/sessions/:id", desc: "Session detail" },
              { method: "GET", path: "/api/sessions/stats", desc: "Session aggregates (duration p50/p95, plugin versions)" },
              { method: "GET", path: "/api/agents/:id/sessions", desc: "Agent sessions with events (decision traces)" },
              { method: "GET", path: "/api/saves", desc: "List saves (blocked actions)" },
              { method: "GET", path: "/api/saves/count", desc: "Total save count" },
              { method: "GET", path: "/api/status", desc: "Health check (public)" },
            ].map((e) => (
              <div
                key={`${e.method}-${e.path}`}
                className="flex items-center gap-3 px-4 py-2.5"
                style={{ borderBottom: "1px solid var(--color-border)" }}
              >
                <span
                  className="font-bold shrink-0 w-12"
                  style={{
                    color: e.method === "GET" ? "var(--color-green)" :
                           e.method === "POST" ? "var(--color-sky)" :
                           e.method === "PUT" ? "var(--color-yellow)" :
                           "var(--color-coral)",
                  }}
                >
                  {e.method}
                </span>
                <Code>{e.path}</Code>
                <span className="ml-auto" style={{ color: "var(--color-text-tertiary)" }}>{e.desc}</span>
              </div>
            ))}
          </div>

          {/* ═══════════════ PRICING ═══════════════ */}
          <SectionHeader id="pricing">Pricing</SectionHeader>
          <div
            className="rounded-lg overflow-hidden my-4 text-xs"
            style={{ border: "1px solid var(--color-border)" }}
          >
            {[
              { tier: "Open Source", price: "Free", agents: "Unlimited", rules: "Unlimited pattern", history: "Local", extras: "Kill switch + auto-kill, injection detection, spend/rate limits, local dashboard" },
              { tier: "Pro", price: "$5/mo", agents: "1 (+$3/ea)", rules: "Unlimited + 5 NL", history: "90 days", extras: "Cloud dashboard, AI detection, cost analytics, session timelines, all alerts, 14-day trial" },
              { tier: "Team", price: "$19/mo", agents: "5 (+$2/ea)", rules: "Unlimited + 20 NL + shared", history: "1 year", extras: "10 members, 5-min eval, auto-kill, full role management" },
              { tier: "Enterprise", price: "Custom", agents: "Unlimited", rules: "Unlimited", history: "Unlimited", extras: "SSO, audit logs, custom webhooks, custom roles" },
            ].map((t) => (
              <div
                key={t.tier}
                className="flex items-center gap-4 px-4 py-3"
                style={{ borderBottom: "1px solid var(--color-border)" }}
              >
                <span className="font-semibold w-20">{t.tier}</span>
                <span className="w-16" style={{ color: "var(--color-coral)" }}>{t.price}</span>
                <span className="flex-1" style={{ color: "var(--color-text-secondary)" }}>
                  {t.agents} agents, {t.rules} rules, {t.history} history. {t.extras}.
                </span>
              </div>
            ))}
          </div>

          {/* ═══════════════ TROUBLESHOOTING ═══════════════ */}
          <SectionHeader id="troubleshooting">Troubleshooting</SectionHeader>

          <div className="flex flex-col gap-4 my-4">
            {[
              {
                q: "Events not showing up on the dashboard",
                a: "Check that your API key is correct and starts with clw_live_. Verify the backend URL is reachable. Events are batched every 5 seconds — wait a moment after starting your agent.",
              },
              {
                q: "Kill switch didn't trigger",
                a: "Free tier gets 1 kill per month. Pro and above get unlimited kills. If you've used your monthly kill, upgrade to Pro. Check that the WebSocket connection is active (look for reconnection logs). The local failsafe (spend limits, rate limits, tool blocklist) always works regardless of tier.",
              },
              {
                q: "Rule not firing",
                a: "Check that the rule is enabled. Verify the event type matches (e.g., a rate rule on 'tool_use' won't trigger on 'llm_call'). Keyword rules are case-insensitive by default. NL rules require backend connectivity.",
              },
              {
                q: "Agent paused unexpectedly",
                a: "Check your spend limit (default $100/session) and rate limit (default 120 calls/min). These fire automatically via the local failsafe. Adjust in your openclaw.json config.",
              },
              {
                q: "Can't connect to WebSocket",
                a: "The plugin reconnects automatically with exponential backoff (1s to 60s). If behind a firewall, ensure outbound WebSocket connections to api.halt.dev are allowed. HTTPS fallback is always active.",
              },
            ].map((faq) => (
              <div
                key={faq.q}
                className="p-4 rounded-lg"
                style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
              >
                <div className="font-semibold text-sm mb-2">{faq.q}</div>
                <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{faq.a}</p>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div
            className="mt-16 pt-8 text-center text-xs"
            style={{ borderTop: "1px solid var(--color-border)", color: "var(--color-text-tertiary)" }}
          >
            <p>
              Need help? Email{" "}
              <a href="mailto:support@halt.dev" style={{ color: "var(--color-coral)" }}>support@halt.dev</a>
            </p>
            <p className="mt-2">
              <Link href="/" style={{ color: "var(--color-text-secondary)" }}>Home</Link>
              {" / "}
              <Link href="/demo" style={{ color: "var(--color-text-secondary)" }}>Demo</Link>
              {" / "}
              <Link href="/pricing" style={{ color: "var(--color-text-secondary)" }}>Pricing</Link>
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

# halt Feature Roadmap

## Now (Pre-Launch)
- [x] Core monitoring + event capture
- [x] Pattern rules (threshold, rate, keyword)
- [x] Kill switch (2-path: in-process + server-triggered)
- [x] Pre-action rule enforcement (local rule cache)
- [x] AI anomaly detection + behavioral baselines
- [x] Natural language rules
- [x] Multi-channel alerts (email, Telegram, Discord, SMS)
- [x] Dashboard with real data
- [x] GitHub OAuth + Stripe billing
- [x] Free teams with gated features
- [x] Enterprise features (audit logs, webhooks, SSO, custom roles)
- [x] Security hardened (all review findings fixed)

## Shipped (Post-Launch)
- [x] Cost tracking dashboard — per-agent spend cards, 7-day trend chart, top costly events
- [x] Decision traces — visual session timelines on agent detail pages
- [x] Subagent mediation — all rules/kill/failsafe/auto-kill apply to subagent tool calls, subagent_id threaded into all event types
- [x] npm publish @halt/plugin and @halt/cli to registry
- [x] Named API key management (create, rename, revoke)
- [x] Rule template library (23 templates, 5 categories including Shield)
- [x] `halt init` CLI (GitHub device flow + email magic link)

## Shipped (Session 3 — March 20-21)
- [x] Rule action modes — block, alert, or both per rule
- [x] Sessions table with lifecycle tracking (active/completed/killed)
- [x] Expandable activity feed — full detail, time range filter (1h/6h/24h/7d), sort (errors/cost/tool), session filter
- [x] Blocked events — BLOCKED badge + strikethrough, block_reason/source in metadata
- [x] Error tracking — error count in stats, ERROR badge, error-first sorting
- [x] Cost by tool + cost by model breakdowns in dashboard sidebar
- [x] Agent detail tabs (Overview | Sessions)
- [x] Subagent sessions nested within parent sessions
- [x] Descriptive tool labels (exec: ls -la)
- [x] Saves page with agent name, rule name, potential impact
- [x] Trial countdown in tier badge
- [x] Sortable columns on top events table
- [x] Session stats API (duration aggregates, plugin version distribution)
- [x] Sentinel QA agent (MiniMax M2.7 + Gemini Flash Lite subagents)
- [x] Framework adapters: core + CrewAI + Claude SDK + OpenAI + LangChain + Vercel AI (alt-adapters branch)
- [x] **Shield** — injection detection engine: 140 patterns, 6 categories (destructive commands, credential exfiltration, instruction overrides, system prompt manipulation, encoding obfuscation, data exfiltration), 3 severity tiers, input+output scanning, deep object traversal, code fence awareness, auto-kill escalation
- [x] License: AGPL-3.0 → MIT on all client packages (plugin, shared, CLI), CLA added
- [x] `halt test` CLI — curated attack suite (54 tests), reliability scoring, CI/CD gating via exit codes
- [x] Optimistic locking on kill/resume, structured pino logging, competitive use ToS clauses
- [x] **Agent auto-discovery** — plugin reads ~/.openclaw/openclaw.json on startup, batch-registers all agents as "discovered". Activate from dashboard to start monitoring. Tier limits enforced on activation, not discovery.
- [x] **Per-agent rule scoping** — rules can target specific agents or all agents. Scope selector in create rule modal, scope column in rules table, plugin filters rules by agent_id.
- [x] `halt discover` CLI — register agents from openclaw.json before first run. Secure agents before they start.
- [x] Shield templates in template library — 3 Shield templates (Critical, High, Medium) now visible in dashboard template library under Shield tab
- [x] **Agent-visible rules** — rules injected into agent system prompt via before_prompt_build hook. Per-rule toggle (agent sees vs silent enforcement) + system-wide transparency mode (all_visible/per_rule/all_silent) in Settings.
- [x] **Tool auto-discovery** — plugin + CLI extract tool names from openclaw.json agent deny/allow lists. GET /api/tools merges discovered tools with tools seen in events. Combobox picker in dashboard rule creation (dropdown + search + custom entry).

## Post-Launch (Near-Term)
- [ ] **Tool scoping / allowlists** — new rule type: define which tools an agent CAN use, deny everything else. Inverse of Shield (blocklist vs allowlist). Enterprise demand validated by CapNET plugin.
- [x] **Pre-registered agents** — agents auto-discovered on plugin startup. Can also be pre-registered via `halt discover` CLI. Discovered agents visible in dashboard before first event.
- [ ] **Policy-as-code** — declarative YAML/JSON policies defining full agent capabilities (tools, URLs, spend limits, permissions). Ships in plugin config, enforced locally. Enterprise pattern validated by OpenClaw ACP and ClawForge.
- [ ] **URL reputation in Shield** — check outbound URLs against known-bad lists. Validated by openclaw-url-guard plugin.
- [ ] **Ask/Delegate/Autonomous modes** — remote agent control with human-in-the-loop, delegated auto-approve, or fully autonomous with kill switch backstop. Validated by openclaw-code-agent plugin.
- [ ] Mobile responsive design (full mobile layout, not just fixes)
- [ ] `halt check` one-liner — zero-config quick scan, `halt check my-agent.ts`
- [ ] Event replay — click any dashboard event → replay against current rules, show what would fire
- [ ] `halt replay <event-id>` — CLI version of event replay
- [ ] Crash dump — save failing event payloads to `.halt/failures/` for local debugging
- [ ] Circuit breaker with half-open probe — auto-recover after cooldown, capped at 3 retries then permanent kill
- [ ] CI/CD GitHub Action — `@halt/github-action` posts Shield reliability scores on PRs, blocks merge below threshold
- [ ] Reliability badges for README — `![Shield Reliability](shields.io/...)`
- [ ] Agent health score on dashboard — reliability over time (not just per-test), trend chart
- [ ] Rule effectiveness analytics — which rules fire most, which never fire, stale rule detection
- [ ] Feedback widget redesign (Resend-style textarea + send button, keyboard shortcut)
- [ ] Email/password authentication
- [ ] **Configurable severity + channel routing** — per-rule severity levels with user-defined routing per channel
- [ ] Data export from settings
- [ ] Real-time WebSocket event feed in dashboard
- [ ] Human review queue — flag events for manual review before action
- [ ] Growth plan tier (if data shows demand between Pro and Team)

## Post-Launch (Expansion)
- [ ] Framework adapters — ship from alt-adapters branch (CrewAI, Claude SDK, OpenAI Agents, LangChain, Vercel AI)
- [ ] MCP-native support — expand beyond OpenClaw plugin hooks to MCP protocol
- [ ] OpenTelemetry trace export — interop with Datadog, Jaeger, Zipkin, Grafana
- [ ] Self-hosted deployment option for enterprise (Docker/Helm)
- [ ] Identity provider integration (Okta, Microsoft Entra) for enterprise SSO
- [ ] Security research content marketing — agent failure mode blog posts, "Pwning agents" series
- [ ] Deploy operator agent team on VPS

## Agent Insurance (Planned)
If halt's kill switch fails to catch a runaway and your agent overspends your configured limit, we refund the overage.

- Pro: up to $100 overage coverage per incident
- Team: up to $500
- Enterprise: up to $5,000 (or custom SLA)

Nobody else can offer this because nobody else blocks actions before they execute. It transforms halt from a monitoring tool into a financial guarantee.

## Future
- [ ] **Remote agent messaging** — inject messages into running agents mid-session via WebSocket. Course-correct without killing.
- [ ] **Dashboard control bot** — natural language commands to manage agents ("Kill my deploy-assistant", "Set rate limit of 10 emails/min"). Pairs with rule template library.
- [ ] **Per-subagent control (higher tier)** — per-subagent kill switch, per-subagent rule scoping, per-subagent metrics. Base mediation already works; this is granular control.
- [ ] **Compounding behavioral baselines** — individual agent baselines grow smarter over time, condensing 72 hours into 1000+ hours of learned behavior. Richer baselines catch subtler anomalies. Pairs with community threat intelligence for a global baseline across opt-in users.
- [ ] **Anomaly-triggered auto-kill** — kill on critical behavioral deviation, not just rule violations. Needs 72h baseline data from beta testers first.
- [ ] **PII detection in outputs** — detect PII in agent outputs. Requires output monitoring (not just tool calls).
- [ ] **Monitor agent thinking/text output** — capture the agent's reasoning and text output for full visibility into what it's thinking before it acts
- [ ] **Self-evolving rules** — detect user frustration patterns → auto-propose rules. "Your frustration becomes a rule." Pairs with control bot for one-click confirmation.
- [ ] **Policy backtesting + shadow mode** — simulate rules against historical events before enforcing. POST /api/rules/simulate returns would_block, would_alert, top matched actions. Per-rule shadow toggle lets users test rules in production without blocking. Reduces false-positive fear, increases kill-switch adoption.
- [ ] **Pre-action NL enforcement** — compile NL rules to deterministic matchers (keywords/patterns/constraints) at save-time, ship compiled form to plugin cache for real-time pre-action checks. Makes NL rules truly real-time and offline-safe, not batch-only.
- [ ] **Autonomous incident runbooks** — shift from "detect + stop" to "detect + stop + recover." Runbook templates: pause agent, rotate API key, notify channel, open incident ticket. Allowlisted actions with idempotency. Orchestrated safe remediation, not just alerting.
- [ ] **Community threat intelligence + signed rule packs** — opt-in cross-user anomaly patterns and data flywheel. Generate anonymized threat signatures from saves, publish signed global rule packs, fetch in plugin alongside user rules. Every customer's incident data improves protection for all customers.
- [ ] Multi-agent coordination monitoring (cross-agent anomaly patterns)
- [ ] Agent performance scoring (cost-per-task, efficiency benchmarks)
- [ ] Cross-user threat intelligence data flywheel — new failure modes detected across the network protect everyone
- [ ] One-click action rollback (undo the last N actions after a kill)
- [ ] Mobile app for alerts + kill switch

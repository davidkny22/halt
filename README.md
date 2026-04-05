<p align="center">
  <img src="apps/dashboard/public/favicon.svg" width="48" height="48" alt="Clawnitor" />
</p>

<h3 align="center">Clawnitor</h3>

<p align="center">
  Agent monitoring and kill switch for OpenClaw.
  <br />
  Other tools watch. We intervene.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@clawnitor/plugin"><img src="https://img.shields.io/npm/v/@clawnitor/plugin?label=plugin&color=FF6B4A" alt="npm" /></a>
  <a href="https://clawnitor.io/demo"><img src="https://img.shields.io/badge/demo-live-4ADE80" alt="demo" /></a>
  <a href="https://clawnitor.io/docs"><img src="https://img.shields.io/badge/docs-clawnitor.io-38BDF8" alt="docs" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-BSL--1.1-A78BFA" alt="license" /></a>
</p>

---

Clawnitor hooks into OpenClaw's `before_tool_call`. Every action your agent tries to take gets evaluated against your rules **before it executes** — not after. If a rule matches, the action is blocked in-process with zero network latency.

**[Try the live demo](https://clawnitor.io/demo)** — no signup required.

## What it does

- **Pre-action kill switch** — 3 layers of defense: server kill state, local failsafe, cached rule evaluation. All run before execution. Auto-kill: agents that trigger repeated rule violations are automatically shut down.
- **Kill from anywhere** — manual kill switch works from the dashboard, API, or any device. Your agents are under your control wherever you are.
- **Smart rules** — threshold, rate, keyword, or describe what you want in plain English. Each rule can block, alert, or both — your choice per rule. AI evaluates NL rules against the event stream.
- **AI anomaly detection** — 72-hour behavioral baselines. Clawnitor learns what normal looks like, then flags what isn't.
- **Multi-channel alerts** — email, Telegram, Discord, SMS. Get notified where you actually look.
- **Cost tracking** — per-agent spend breakdowns, 7-day trend charts, most expensive calls ranked. Know exactly where your money goes.
- **Decision traces** — visual timeline of every tool call within a session. See what your agent did, in what order, with per-call cost and model info.
- **Subagent tracking** — subagent spawning/ending captured with attribution. See parent-child relationships in your session timelines.
- **Offline resilience** — SQLite cache, local failsafe, and cached rules stay active even when the internet isn't.
- **Cloud dashboard** — expandable activity feed with sorting and time range filters, spend analytics (per-agent, per-tool, per-model), session tracking with lifecycle management, decision traces with subagent nesting, rules manager, saves history, team management.

## Quick start

```bash
openclaw plugins install @clawnitor/plugin
npx clawnitor init
```

That's it. `clawnitor init` handles authentication, API key generation, and config — all in one command.

**Or manually:** sign up at [clawnitor.io](https://clawnitor.io), copy your API key, and add it to your `openclaw.json`:

```json
{
  "plugins": {
    "entries": {
      "clawnitor": {
        "config": {
          "apiKey": "clw_live_your_key_here"
        }
      }
    }
  }
}
```

## How it works

```
OpenClaw Agent                    Clawnitor Backend
┌────────────────┐    HTTPS      ┌──────────────────┐
│ Clawnitor      │ ────────────> │ Rules engine      │
│ Plugin         │               │ Anomaly detection │
│                │   WebSocket   │ Alert dispatcher  │
│ Event capture  │ <───────────> │ Kill signals      │
│ Kill switch    │               └────────┬─────────┘
│ Local failsafe │                        │
│ Rule cache     │               ┌────────┴─────────┐
│ SQLite cache   │               │ Dashboard         │
└────────────────┘               │ app.clawnitor.io  │
                                 └──────────────────┘
```

## Pricing

| | Free | Pro ($5/mo) | Team ($19/mo) | Enterprise |
|---|---|---|---|---|
| Agents | 1 | 1 (+$3/ea) | 5 (+$2/ea) | Unlimited |
| Rules | 3 pattern | Unlimited + 5 NL | Unlimited + 20 NL | Unlimited |
| Kill switch | 1/mo + local failsafe | Unlimited + auto-kill | Unlimited + auto-kill | Unlimited + auto-kill |
| Cost tracking | Yes | Yes | Yes | Yes |
| Decision traces | Yes | Yes | Yes | Yes |
| AI detection | — | 15-min eval | 5-min eval | 5-min eval |
| Alerts | Email | All channels | All channels | All + webhooks |
| History | 7 days | 90 days | 1 year | Unlimited |
| Team members | 2 | 3 | 10 | Unlimited |
| SSO / Audit logs | — | — | — | Yes |

14-day free trial of Pro. No credit card required.

## Links

- [Live demo](https://clawnitor.io/demo) — try it without signing up
- [Documentation](https://clawnitor.io/docs) — quickstart, config reference, API
- [Plugin on npm](https://www.npmjs.com/package/@clawnitor/plugin) — `npm install @clawnitor/plugin`
- [Report issues](https://github.com/davidkny22/clawnitor/issues)

## Tech stack

Fastify, Drizzle ORM, PostgreSQL, BullMQ, Redis, Next.js 15, Tailwind CSS, Auth.js, Stripe, Gemini 2.5 Flash-Lite, Resend. Monorepo via pnpm + Turborepo.

## License

[BSL 1.1](LICENSE) — source-available, converts to AGPL-3.0. Plugin is [AGPL-3.0](https://github.com/davidkny22/clawnitor-plugin/blob/main/LICENSE) (open source).

---

<p align="center">
  Built by <a href="https://github.com/davidkny22">David Kogan</a>. Your agents run while you sleep. We keep their claws where they belong.
</p>

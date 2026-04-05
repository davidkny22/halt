<p align="center">
  <img src="apps/dashboard/public/favicon.svg" width="48" height="48" alt="halt" />
</p>

<h3 align="center">halt</h3>

<p align="center">
  Agent monitoring and kill switch for OpenClaw.
  <br />
  Other tools watch. We intervene.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@halt/plugin"><img src="https://img.shields.io/npm/v/@halt/plugin?label=plugin&color=FF6B4A" alt="npm" /></a>
  <a href="https://halt.dev/demo"><img src="https://img.shields.io/badge/demo-live-4ADE80" alt="demo" /></a>
  <a href="https://halt.dev/docs"><img src="https://img.shields.io/badge/docs-halt.dev-38BDF8" alt="docs" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-AGPL--3.0-A78BFA" alt="license" /></a>
</p>

---

halt hooks into OpenClaw's `before_tool_call`. Every action your agent tries to take gets evaluated against your rules **before it executes** — not after. If a rule matches, the action is blocked in-process with zero network latency.

**[Try the live demo](https://halt.dev/demo)** — no signup required.

## What it does

- **Pre-action kill switch** — 3 layers of defense: server kill state, local failsafe, cached rule evaluation. All run before execution. Auto-kill: agents that trigger repeated rule violations are automatically shut down.
- **Kill from anywhere** — manual kill switch works from the dashboard, API, or any device. Your agents are under your control wherever you are.
- **Smart rules** — threshold, rate, keyword, or describe what you want in plain English. Each rule can block, alert, or both — your choice per rule. AI evaluates NL rules against the event stream.
- **AI anomaly detection** — 72-hour behavioral baselines. halt learns what normal looks like, then flags what isn't.
- **Multi-channel alerts** — email, Telegram, Discord, SMS. Get notified where you actually look.
- **Shield** — built-in injection detection engine. 180 detection patterns across 6 categories scan both tool inputs and outputs for prompt injection, credential exfiltration, destructive commands, and encoding attacks. Zero latency, zero dependencies.
- **`halt test`** — test your Shield config and rules against 54 curated attack scenarios. Reliability scoring, gap detection, CI/CD gating via exit codes. `--json` for pipelines, `--verbose` for debugging.
- **Cost tracking** — per-agent spend breakdowns, 7-day trend charts, most expensive calls ranked. Know exactly where your money goes.
- **Decision traces** — visual timeline of every tool call within a session. See what your agent did, in what order, with per-call cost and model info.
- **Subagent tracking** — subagent spawning/ending captured with attribution. See parent-child relationships in your session timelines.
- **Offline resilience** — Local cache, local failsafe, and cached rules stay active even when the internet isn't.
- **Cloud dashboard** — expandable activity feed with sorting and time range filters, spend analytics (per-agent, per-tool, per-model), session tracking with lifecycle management, decision traces with subagent nesting, rules manager, saves history, team management.

## Quick start

```bash
openclaw plugins install @halt/plugin
```

### Local mode (no account needed)

Add to your `openclaw.json`:

```json
{
  "plugins": {
    "entries": {
      "halt": {
        "config": {
          "offlineMode": true,
          "rules": [
            {
              "id": "block-rm",
              "name": "Block destructive commands",
              "rule_type": "keyword",
              "config": { "keywords": ["rm -rf", "DROP TABLE"], "matchMode": "any" },
              "enabled": true,
              "action_mode": "block"
            }
          ]
        }
      }
    }
  }
}
```

```bash
npx halt serve    # local dashboard on localhost:5173
npx halt report   # text summary of events
```

### Cloud mode

```bash
npx halt init
```

That's it. `halt init` handles authentication, API key generation, and config in one command. All your agents are auto-discovered from `openclaw.json` when the plugin starts. To register agents before they run:

```bash
npx halt discover
```

## How it works

```
OpenClaw Agent                     halt backend (optional)
┌─────────────────┐    HTTPS      ┌───────────────────┐
│ halt plugin     │ ───────────>  │ Rules engine       │
│                 │               │ Anomaly detection  │
│ Event capture   │   WebSocket   │ Alert dispatcher   │
│ Kill switch     │ <──────────>  │ Kill signals       │
│ Local failsafe  │               └─────────┬──────────┘
│ Rule evaluation │                         │
│ Shield scanner  │               ┌─────────┴──────────┐
│ Local cache     │               │ Dashboard          │
└─────────────────┘               │ app.halt.dev       │
                                  └────────────────────┘
```

The plugin works standalone. The backend is optional and adds AI, alerting, teams, and a cloud dashboard.

## Open source (free forever)

Everything below runs locally with no account, no cloud dependency, and no limits:

- Kill switch + auto-kill (configurable per agent)
- Injection detection (180 patterns, 6 categories)
- Pattern rules (keyword, rate, threshold)
- Spend and rate limits
- Local dashboard (`halt serve`)
- CLI tools (`halt test`, `halt check`, `halt report`, `halt discover`)

## Cloud pricing

| | Pro ($5/mo) | Team ($19/mo) | Enterprise |
|---|---|---|---|
| Agents | 1 (+$3/ea) | 5 (+$2/ea) | Unlimited |
| NL rules | 5 | 20 | Unlimited |
| AI anomaly detection | 15-min eval | 5-min eval | 5-min eval |
| Cost analytics | Yes | Yes | Yes |
| Session timelines | Yes | Yes | Yes |
| Alerts | All channels | All channels | All + webhooks |
| History | 90 days | 1 year | Unlimited |
| Team members | — | 10 | Unlimited |
| SSO / Audit logs | — | — | Yes |

14-day free trial of Pro. No credit card required.

## Links

- [Live demo](https://halt.dev/demo) — try it without signing up
- [Documentation](https://halt.dev/docs) — quickstart, config reference, API
- [Plugin on npm](https://www.npmjs.com/package/@halt/plugin) — `npm install @halt/plugin`
- [Report issues](https://github.com/davidkny22/halt/issues)

## Tech stack

Fastify, Drizzle ORM, PostgreSQL, BullMQ, Redis, Next.js 15, Tailwind CSS, Auth.js, Stripe, Gemini 2.5 Flash-Lite, Resend. Monorepo via pnpm + Turborepo.

## Contributing

Contributions are welcome. By opening a pull request, you agree to the [Contributor License Agreement](CLA.md).

## License

[AGPL-3.0](LICENSE). Enterprise features in [`ee/`](ee/) are under a separate [commercial license](ee/LICENSE). For commercial licensing (embedding, OEM, or hosting without AGPL obligations), contact [david@halt.dev](mailto:david@halt.dev).

---

<p align="center">
  Built by <a href="https://github.com/davidkny22">David Kogan</a>. Because trust is earned.
</p>

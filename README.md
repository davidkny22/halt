# 🦞 Clawnitor

**Agent monitoring, alerting, and kill switch for OpenClaw.**

Your agents run while you sleep. Clawnitor keeps its claws on them.

---

## What is Clawnitor?

Clawnitor is the all-in-one monitoring and intervention framework for autonomous AI agents running on [OpenClaw](https://openclaw.ai). It captures every action your agent takes, evaluates custom rules in real-time, fires multi-channel alerts, and can instantly pause runaway agents — all from a beautiful cloud dashboard.

## Features

- **Real-time event capture** — hooks into every tool call, LLM request, message, and lifecycle event
- **Pattern-matching rules** — threshold, rate, and keyword alerts with instant evaluation
- **AI anomaly detection** — behavioral baselines + Claude Haiku scoring (Pro)
- **Natural language rules** — "Alert me if my agent seems confused" (Pro)
- **2-path kill switch** — instant in-process blocking + server-triggered pause (Pro)
- **Local failsafe** — spend circuit breaker, rate limiter, tool blocklist (always active)
- **Multi-channel alerts** — email (free), Telegram, Discord, SMS (Pro)
- **Cloud dashboard** — activity feed, stats, rules manager, alert history, agent management
- **Offline resilience** — SQLite cache ensures no events are lost during network blips

## Quick Start

```bash
# 1. Sign up at https://clawnitor.io

# 2. Install the plugin
openclaw plugins install @clawnitor/plugin

# 3. Add your API key to openclaw.json
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

# 4. Your agents are now monitored 🦞
```

## Architecture

```
┌─────────────────────┐     HTTPS      ┌──────────────────────┐
│   OpenClaw Agent     │ ──────────────→│   Clawnitor Backend   │
│                      │                │                       │
│  ┌────────────────┐  │   WebSocket    │  Rules Engine          │
│  │ Clawnitor      │  │ ←────────────→│  Anomaly Detection     │
│  │ Plugin         │  │               │  Alert Dispatcher      │
│  │                │  │               │  Billing (Stripe)      │
│  │ • Event capture│  │               └───────────┬───────────┘
│  │ • Kill switch  │  │                           │
│  │ • Local cache  │  │               ┌───────────┴───────────┐
│  │ • Failsafe     │  │               │   Next.js Dashboard    │
│  └────────────────┘  │               │   clawnitor.io         │
└─────────────────────┘               └───────────────────────┘
```

## Pricing

| | Free | Pro ($5/mo) |
|---|---|---|
| Event audit trail | ✅ | ✅ |
| Pattern rules | 3 | Unlimited |
| NL rules (AI) | — | ✅ |
| Kill switch | — | ✅ |
| Anomaly detection | — | ✅ |
| Alert channels | Email | Email, Telegram, Discord, SMS |
| Event history | 7 days | 90 days |
| Additional agents | — | $3/mo each |

14-day free trial of Pro. No credit card required.

## Tech Stack

- **Monorepo**: pnpm + Turborepo
- **Backend**: Fastify, Drizzle ORM, PostgreSQL, BullMQ, Redis
- **Plugin**: TypeScript, OpenClaw hooks API, SQLite (better-sqlite3)
- **Dashboard**: Next.js, Tailwind CSS, Satoshi font
- **AI**: Anthropic Claude Haiku
- **Billing**: Stripe
- **Alerts**: Resend, Telegram Bot API, Discord webhooks, Twilio

## Development

```bash
# Prerequisites: Node.js 20+, pnpm, Docker

# Start infrastructure
docker compose up -d

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env

# Push database schema
pnpm db:push

# Run all tests
pnpm --filter @clawnitor/shared test
pnpm --filter @clawnitor/api test
pnpm --filter @clawnitor/plugin test

# Start backend
pnpm --filter @clawnitor/api dev

# Start dashboard
pnpm --filter @clawnitor/dashboard dev
```

## Project Structure

```
clawnitor/
├── packages/
│   ├── shared/          # Types, schemas, constants
│   ├── api/             # Fastify backend
│   └── plugin/          # OpenClaw plugin
├── apps/
│   └── dashboard/       # Next.js dashboard
├── operator/            # Autonomous agent team config
│   └── agents/          # CEO, Marketing, Growth, Support, Engineering
├── docker-compose.yml   # Local PostgreSQL + Redis
└── SKILL.md             # ClawHub marketplace listing
```

---

Built by [David Kogan](https://github.com/davidkny22). Run by lobsters. 🦞

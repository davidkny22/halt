---
name: halt
description: Agent monitoring, alerting, and kill switch for OpenClaw agents
homepage: https://halt.dev
metadata: {"category": "monitoring", "openclaw": {"emoji": "🦞", "requires": {"bins": ["node"]}, "user-invocable": true}}
---

# halt

Real-time monitoring, smart alerting, and emergency kill switch for your OpenClaw agents.

## What it does

halt watches your agents so you don't have to:

- **Event capture** — logs every tool call, LLM request, message, and lifecycle event
- **Shield** — built-in injection detection engine. 140 patterns, 6 categories, 3 severity tiers. Blocks destructive commands, credential theft, prompt injection, and more.
- **Smart rules** — threshold, rate, keyword, and natural language rules. Per-agent or global scoping. Each rule: block, alert, or both.
- **Kill switch** — instantly pause runaway agents from anywhere. Auto-kill shuts down agents after repeated rule violations.
- **Cost tracking** — per-agent spend breakdowns, trend charts, most expensive calls
- **Decision traces** — visual session timelines with lifecycle tracking, subagent nesting, blocked event badges
- **Subagent tracking** — subagent lifecycle events with parent-child attribution
- **AI anomaly detection** — behavioral baselines + AI scoring (Pro)
- **Multi-channel alerts** — email (free), Telegram, Discord, SMS (Pro)

## Quick start

1. Install: `openclaw plugins install @halt/plugin`
2. Set up: `npx halt init`
3. All agents auto-discovered from your `openclaw.json`
4. Activate agents to monitor from the dashboard

Or manually: sign up at https://halt.dev, copy your API key, add to openclaw.json.

## Configuration

```json
{
  "plugins": {
    "entries": {
      "halt": {
        "config": {
          "apiKey": "${CLAWNITOR_API_KEY}",
          "backendUrl": "https://api.halt.dev",
          "spendLimit": 100,
          "rateLimit": 120,
          "toolBlocklist": [],
          "redactionPatterns": []
        }
      }
    }
  }
}
```

## Pricing

- **Free** — 1 agent, 3 rules, email alerts, audit trail
- **Pro ($5/mo)** — 1 agent (+$3/ea), up to 5 NL rules, 15-min AI eval, kill switch, anomaly detection, all alert channels
- **Team ($19/mo)** — 5 agents (+$2/ea), 20 NL rules, 5-min eval, shared rules, 10 members

Learn more at https://halt.dev

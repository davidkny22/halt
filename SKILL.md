---
name: Clawnitor
description: Agent monitoring, alerting, and kill switch for OpenClaw agents
homepage: https://clawnitor.io
metadata: {"category": "monitoring", "openclaw": {"emoji": "🦞", "requires": {"bins": ["node"]}, "user-invocable": true}}
---

# Clawnitor

Real-time monitoring, smart alerting, and emergency kill switch for your OpenClaw agents.

## What it does

Clawnitor watches your agents so you don't have to:

- **Event capture** — logs every tool call, LLM request, message, and lifecycle event
- **Pattern rules** — threshold, rate, and keyword alerts (3 free, unlimited on Pro)
- **Kill switch** — instantly pause runaway agents from anywhere. Auto-kill shuts down agents after repeated rule violations.
- **AI anomaly detection** — behavioral baselines + AI scoring (Pro)
- **Multi-channel alerts** — email (free), Telegram, Discord, SMS (Pro)

## Quick start

1. Install: `openclaw plugins install @clawnitor/plugin`
2. Set up: `npx clawnitor init`
3. Your agents are now monitored

Or manually: sign up at https://clawnitor.io, copy your API key, add to openclaw.json.

## Configuration

```json
{
  "plugins": {
    "entries": {
      "clawnitor": {
        "config": {
          "apiKey": "${CLAWNITOR_API_KEY}",
          "backendUrl": "https://api.clawnitor.io",
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

Learn more at https://clawnitor.io

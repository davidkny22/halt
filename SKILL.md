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
- **Kill switch** — instantly pause runaway agents, locally or from your dashboard
- **AI anomaly detection** — behavioral baselines + Claude Haiku scoring (Pro)
- **Multi-channel alerts** — email (free), Telegram, Discord, SMS (Pro)

## Quick start

1. Sign up at https://clawnitor.io
2. Install: `openclaw plugins install @clawnitor/plugin`
3. Configure your API key in openclaw.json
4. Your agents are now monitored

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
- **Pro ($5/mo)** — unlimited agents ($3/mo each), unlimited rules, kill switch, AI anomaly detection, multi-channel alerts

Learn more at https://clawnitor.io

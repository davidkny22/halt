# @halt/plugin

[![npm](https://img.shields.io/npm/v/@halt/plugin?color=FF6B4A)](https://www.npmjs.com/package/@halt/plugin)
[![license](https://img.shields.io/badge/license-MIT-A78BFA)](LICENSE)

Agent monitoring, rules enforcement, and kill switch for OpenClaw. Blocks dangerous actions **before** they execute.

## Why

Prompt-level safety instructions are fragile — they get dropped during context compaction, ignored by the model, or overridden by conflicting instructions. halt enforces rules at the architecture level via `before_tool_call`. Context compaction can't drop it because it's not in the context.

## Install

```bash
openclaw plugins install @halt/plugin
npx halt init
```

`halt init` handles authentication, API key generation, and config in one command.

**Or manually:** sign up at [halt.dev](https://halt.dev), copy your API key, and add to `openclaw.json`:

```json
{
  "plugins": {
    "entries": {
      "halt": {
        "config": {
          "apiKey": "clw_live_your_key_here"
        }
      }
    }
  }
}
```

Get your API key at [halt.dev](https://halt.dev). Events appear on your dashboard immediately.

## What it captures

| Event | Hook | Details |
|-------|------|---------|
| Tool calls | `before_tool_call` / `after_tool_call` | Name, params, result, duration. **Can block.** |
| LLM requests | `llm_input` / `llm_output` | Model, tokens, cost |
| Messages | `message_sending` / `message_sent` / `message_received` | Content (redacted). **Can block sends.** |
| Lifecycle | `session_start` / `session_end` / `agent_end` | Session tracking |
| Sub-agents | `subagent_spawning` / `subagent_ended` | Subagent ID attribution, parent-child tracking |

## Pre-action defense (3 layers + auto-kill)

Every tool call and message is checked **before execution**:

1. **Kill state** — server-triggered pause via WebSocket. Kill from anywhere — dashboard, API, any device.
2. **Local failsafe** — spend circuit breaker, rate limiter, tool blocklist. Always active, even offline.
3. **Cached rules** — your server-side rules fetched every 60s, evaluated locally. Keyword, rate, threshold — all pre-action. Each rule is configured to **block**, **alert**, or **both** — alert-only rules let the action proceed and notify you instead.

**Auto-kill:** If an agent triggers 3+ rule violations within a configurable time window (default: 10 minutes), halt automatically kills it. No manual intervention needed. Configurable per agent.

If any layer triggers, the action is blocked in-process. Zero network latency.

```
// Agent tries to run: bash("rm -rf /app/data")
// halt intercepts via before_tool_call:

BLOCKED by halt
  Rule matched: keyword "rm -rf"
  Action stopped before execution

// After 3 violations in 10 minutes:
AUTO-KILLED by halt
  3 violations in 8 minutes (threshold: 3)
  Agent fully stopped. Resume from dashboard when ready.
```

## Configuration

| Option | Default | Description |
|--------|---------|-------------|
| `apiKey` | **required** | Your halt API key (starts with `clw_live_`) |
| `backendUrl` | `https://api.halt.dev` | Backend URL |
| `spendLimit` | `100` | Session spend limit in USD before auto-pause |
| `rateLimit` | `120` | Max tool calls per minute before auto-pause |
| `toolBlocklist` | `[]` | Tool names to always block (case-insensitive) |
| `redactionPatterns` | `[]` | Additional regex patterns for secret redaction |

### Full example

```json
{
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
}
```

## Dashboard features powered by this plugin

All captured events feed into the halt dashboard at [app.halt.dev](https://app.halt.dev):

- **Cost tracking** — per-agent spend breakdowns, 7-day trend charts, most expensive calls ranked
- **Decision traces** — visual session timelines showing every tool call in order, with cost and model attribution
- **Subagent tracking** — parent-child relationships visible in session timelines via subagent_id attribution
- **Saves counter** — tracks every time halt blocked a harmful action
- **Shield** — injection detection badges, threat stats, severity-tagged Shield rules in the rules table

## Shield

Built-in injection detection engine. Scans both tool inputs (before execution) and tool outputs (after execution — catches indirect injection from RAG, APIs, and databases).

**140 detection patterns** across 6 categories:
- **Critical** — destructive commands (`rm -rf`, `DROP TABLE`, `curl|bash`), credential exfiltration (AWS keys, GitHub tokens, Stripe keys, JWTs, private keys, 30+ service patterns)
- **High** — prompt injection (instruction overrides, system prompt manipulation, jailbreaks, stealth patterns, multi-turn manipulation)
- **Medium** — encoding tricks (zero-width chars, homoglyphs, RTL overrides), data exfiltration (PII in outputs, crypto addresses, healthcare IDs)

Shield is enabled by default for Pro+ users. Critical threats are always blocked. High and medium tiers are configurable (block or alert per rule). Zero latency — pure pattern matching, no API calls.

## Privacy

Sensitive data (API keys, passwords, tokens) is automatically redacted before transmission. 25+ built-in patterns plus your custom `redactionPatterns`. Data sharing for aggregate pattern improvement is opt-in and **off by default**.

## Links

- [Live demo](https://halt.dev/demo) — see it in action, no signup
- [Documentation](https://halt.dev/docs) — full reference
- [Dashboard](https://app.halt.dev) — sign up and monitor
- [Main repo](https://github.com/davidkny22/halt) — backend + dashboard source

## Contributing

Contributions are welcome. By opening a pull request, you agree to the [Contributor License Agreement](https://github.com/davidkny22/halt/blob/main/CLA.md).

## License

[MIT](LICENSE)

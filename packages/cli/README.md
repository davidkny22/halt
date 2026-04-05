# @halt/cli

[![npm](https://img.shields.io/npm/v/@halt/cli?color=FF6B4A)](https://www.npmjs.com/package/@halt/cli)
[![license](https://img.shields.io/badge/license-MIT-A78BFA)](LICENSE)

CLI for [halt](https://halt.dev) — agent monitoring, rules enforcement, and kill switch for OpenClaw.

## Usage

```bash
openclaw plugins install @halt/plugin
npx halt init
```

`halt init` handles authentication, API key generation, and configuration in one command. Choose GitHub or email magic link to sign in.

```
$ npx halt init

  halt — Agent monitoring for OpenClaw
  by Safer Intelligence Labs

  How do you want to sign in?
  1. GitHub
  2. Email magic link

  > 1

  Open this URL:  https://github.com/login/device
  Enter code:     ABCD-1234

  Waiting for authorization...
  Authenticated as you@example.com

  Generating API key...
  Writing to openclaw.json...

  Done. halt is monitoring your agents.
  Dashboard: https://app.halt.dev
```

## Discover agents

```bash
npx halt discover
```

Reads all agents from your `~/.openclaw/openclaw.json` and registers them with halt. Useful when you add a new agent and want to set up rules before it runs. Agents are registered as "discovered" — activate them from the dashboard to start monitoring.

## Test your rules

```bash
npx halt test                     # test against live rules
npx halt test --local rules.json  # test against local rules
npx halt test --verbose           # detailed per-test output
npx halt test --json              # machine-readable for CI/CD
```

Runs 54 curated attack scenarios against your Shield config. Reports reliability score, false positive rate, and gaps. Exit code 1 on BLOCK — use in CI/CD pipelines to prevent deploying weak rule configs.

## What `init` does

1. Authenticates via GitHub device flow or email magic link
2. Creates your halt account (or logs in if you already have one)
3. Generates an API key
4. Finds your `openclaw.json` (or creates one) and writes the API key

## Manual setup

If you prefer not to use the CLI, sign up at [halt.dev](https://halt.dev), copy your API key, and add it to your `openclaw.json`:

```json
{
  "plugins": {
    "entries": {
      "halt": {
        "config": {
          "apiKey": "clw_live_..."
        }
      }
    }
  }
}
```

## Links

- [Dashboard](https://app.halt.dev)
- [Documentation](https://halt.dev/docs)
- [Interactive Demo](https://halt.dev/demo)
- [Plugin on npm](https://www.npmjs.com/package/@halt/plugin)

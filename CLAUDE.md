# halt — Development Guide

## What This Is

halt is an agent monitoring SaaS for the OpenClaw ecosystem. It provides real-time event capture, smart rules (block, alert, or both per rule), AI anomaly detection, behavioral baselines, a 3-layer kill switch with auto-kill on repeated violations, and multi-channel alerting. Live at halt.dev, dashboard at app.halt.dev.

## Tech Stack

- **Monorepo:** pnpm + Turborepo
- **Shared types:** `packages/shared/` — Zod schemas, TypeScript interfaces, billing tiers, constants
- **Backend API:** `packages/api/` — Fastify, Drizzle ORM, PostgreSQL, BullMQ + Redis, WebSocket
- **Plugin:** `packages/plugin/` — OpenClaw plugin, hooks API, JSON file cache (zero native deps), local rule evaluation
- **Dashboard:** `apps/dashboard/` — Next.js 15, Tailwind CSS v4, Auth.js (GitHub OAuth)
- **Operator agents:** `operator/` — autonomous operations team (local only, not committed)

## Infrastructure

- **Hosting:** Railway (API + Dashboard as separate services)
- **Database:** PostgreSQL on Railway (schema managed via Drizzle Kit)
- **Redis:** Railway (for BullMQ job queues)
- **Billing:** Stripe (live mode, products created via CLI)
- **Email:** Resend
- **AI:** Gemini 2.5 Flash-Lite via Vertex AI (primary), GPT-4o-mini (fallback). Auto-failover on 3 consecutive failures.
- **Domain:** halt.dev (Namecheap DNS), app.halt.dev for dashboard, api.halt.dev for API
- **Repos:** github.com/davidkny22/halt (private, BSL), github.com/davidkny22/halt-plugin (public, MIT)

## Design System

- **Font:** Satoshi (from Fontshare) — NOT Inter
- **Dark mode (default):** bg #111111, coral accent #FF6B4A, sky blue #38BDF8, purple #A78BFA, green #4ADE80
- **Light mode:** bg #FBF8F4 (warm off-white), coral #D4531A, teal #0D9488
- **Logo:** Geometric claw mark (SVG in `components/logo.tsx`), favicon at `public/favicon.svg`
- **No emojis** in the UI — use SVG Feather icons everywhere
- **Theme toggle** in dashboard nav, persists to localStorage

## Architecture

### Plugin → Backend → Dashboard

1. Plugin hooks into OpenClaw's `before_tool_call`, `after_tool_call`, `llm_input/output`, `message_*`, lifecycle events
2. Events normalized to `HaltEvent` schema, streamed via HTTPS POST to backend
3. Backend stores in PostgreSQL, evaluates rules, fires alerts, sends kill signals via WebSocket
4. Dashboard fetches via internal auth (INTERNAL_API_SECRET + X-User-Email header)
5. Kill switch: 3 layers of pre-action defense — kill state, local failsafe, cached rule evaluation

### Auth

- **Plugin → API:** Bearer token (API key, bcrypt hashed, prefix-based lookup)
- **Dashboard → API (server-side):** INTERNAL_API_SECRET header + X-User-Email (timing-safe comparison)
- **Dashboard users:** GitHub OAuth via Auth.js, session enriched with tier/userId/apiKeyPrefix from backend
- **Dashboard → API (client-side):** Next.js API proxy routes (`/api/rules-action`, `/api/account-action`, `/api/team-action`, `/api/enterprise-action`) that add internal secret server-side

### Database Tables

users, api_keys, agents, events, rules, alerts, baselines, teams, team_members, team_invites, shared_rules, audit_logs, custom_webhooks, sso_configs

### Tiers

- **local/open:** unlimited agents, Shield, rules, kill switch, auto-kill, local dashboard — no account needed
- **paid (Pro):** 1 agent (+$3/ea), 5 NL rules, 15-min AI eval, unlimited kills + auto-kill, cost analytics, session timelines, saves page, all alerts, 90-day history, $5/mo (14-day free trial)
- **free (internal):** expired trial fallback state — 1 agent, 3 rules, email only, 7-day history. Not advertised.
- **team:** 5 agents (+$2/ea), 20 NL rules, 5-min AI eval, unlimited kills + auto-kill, unlimited shared rules, 10 members, 1-year history, $19/mo
- **enterprise:** unlimited everything, 5-min AI eval, auto-kill, multiple teams, SSO/SAML, audit logs, custom webhooks, custom roles

## Key Commands

```bash
# Start infrastructure
docker compose up -d

# Install dependencies
pnpm install

# Build all packages
pnpm turbo build

# Run all tests (173 total)
pnpm --filter @halt/shared test
pnpm --filter @halt/api test
pnpm --filter @halt/plugin test

# Push database schema
pnpm --filter @halt/api db:push

# Start dev servers
pnpm --filter @halt/api dev      # port 3001
pnpm --filter @halt/dashboard dev # port 3000

# Local dashboard (offline mode)
npx halt serve              # localhost:5173
npx halt report             # text summary of local events

# Deploy (auto-deploys on git push to main via Railway)
git push
```

## User Preferences (David Kogan)

- **No co-authorship** in commit messages
- **Specs/plans stay local** — don't commit to git
- **One commit per fix** — scoped, descriptive messages. Never batch. Never use ticket numbers as scope.
- **No fake social proof** — don't claim users/trust that doesn't exist
- **Don't ask to continue** between tasks — just keep going until blocked or done
- **Use executing-plans skill** (not subagent-driven-development)
- **No code in plans** — describe what to build, not the implementation
- **Beautiful dashboard** — use frontend-design skill, Satoshi font, coral accent
- **Data sharing default OFF** — trust-first for a safety product
- **Keep going autonomously** — only stop when genuinely blocked
- **Never tell David to sleep or stop working** — he decides when he's done
- **Never declare done prematurely** — verify everything works before claiming success
- **Fix issues when raised** — don't suggest deferring or explain why it's not worth fixing
- **Use Explore agents for research** — not general-purpose agents (too expensive)

## Post-Feature Update Workflow

After every feature is built, update ALL relevant files. This is mandatory, not optional:

1. **Build & test** — `pnpm turbo build` + run relevant tests
2. **Commit the feature** — one scoped commit
3. **Update docs cascade:**
   - `CLAUDE.md` Current State section
   - `docs/roadmap.md` — mark as shipped
   - `README.md` — if feature is user-facing
   - `SKILL.md` — if it changes capabilities
   - `apps/dashboard/src/app/docs/page.tsx` — docs page sections + API reference
   - `apps/dashboard/src/app/page.tsx` — landing page if relevant
   - Internal docs (local only) — if relevant
4. **Launch explore agent if unsure** — find all files referencing the changed area
5. **Commit docs update** — separate commit from the feature

## Current State (as of 2026-04-08)

### Product
- Repo is public at github.com/davidkny22/halt (AGPL-3.0 + /ee commercial)
- Renamed from Clawnitor to halt (lowercase brand)
- 173 tests passing (21 shared + 36 API + 116 plugin)
- All production audits passed, git history cleaned
- @clawnitor/* npm packages deprecated, @halt/* packages pending publish

### Plugin
- Full offline mode (offlineMode: true, zero cloud dependency)
- Shield injection detection: 180 patterns, 6 categories, 3 severity tiers
- Pre-action rule evaluation: keyword, rate, threshold (evaluated locally before every tool call)
- Kill switch: 3-layer defense (server kill state, local failsafe, cached rules)
- Auto-kill on repeated violations (configurable threshold + window per agent)
- Per-agent isolation: kill state, failsafe, violation tracker, rule cache all per-agent
- Agent auto-discovery from ~/.openclaw/openclaw.json
- Reads rules from ~/.halt/rules.json (shared with local dashboard)
- Subagent mediation: all rules apply to subagent tool calls

### CLI
- `halt init` — GitHub device flow + email magic link auth
- `halt serve` — local dashboard on localhost:5173 (multi-page SPA with rules management)
- `halt report` — text-based event summary
- `halt test` — 54-attack reliability suite with CI/CD gating
- `halt check` — one-line Shield reliability score
- `halt discover` — pre-register agents from openclaw.json

### Cloud Dashboard
- Activity feed with time range filter, sort, expandable events, session filter
- Cost analytics, session timelines, saves page (Pro+ gated)
- Agent management with auto-kill config, discovered vs monitored split
- Rules manager with template library (23 templates, 5 categories)
- Team management, enterprise features (SSO/audit/webhooks in /ee)
- Interactive demo at /demo, comprehensive docs at /docs

### Infrastructure
- Railway (Metal builder) for API + dashboard
- halt.dev (landing), app.halt.dev (dashboard), api.halt.dev (API)
- Stripe billing live (Pro $5/mo, Team $19/mo, Enterprise custom)

### Licensing
- AGPL-3.0 on all open code
- /ee directory with commercial license (enterprise features)
- CLA in place for contributions
- Commercial licensing available for embedding/OEM/hosting

## Next Up

- Publish @halt/* packages to npm
- Landing page restructuring (move kill switch demo up, lead with intervention)
- HN Show post
- Framework adapters: test and publish from alt-adapters branch
- Docker Compose self-hosted backend
- Behavioral fingerprinting engine
- Causal chain analysis (multi-step threat detection)

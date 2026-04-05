# Features To Build

## Build NOW (next session)

### Cost Tracking Dashboard
- Aggregate cost_usd from events by agent, session, day
- Per-agent cost cards on dashboard
- Daily/weekly spend trend chart
- NOTE: spend.ts route already exists from earlier branch — check and reuse
- NOTE: cost_usd and token_count come from OpenClaw's native tracking in event metadata. Verify we're using theirs, not calculating ourselves.

### Token-Level Cost Attribution
- Each event in activity feed shows individual cost
- Event detail view: token count + model + cost
- Per-tool-call cost breakdown

### Decision Traces (Tool Call Visualization)
- Visual timeline of tool calls within a session
- Sequence ordering, show what happened in what order
- No output monitoring needed — just tool call events
- Parent-child relationships if subagents are involved

### Subagent Rule Mediation — DONE
- OpenClaw plugin hooks fire GLOBALLY (main + all subagents) via api.on(). Rules, kill switch, failsafe, and auto-kill ALL apply to subagent tool calls automatically.
- All event types (tool_use, llm_call, message) now detect subagent context via event.sessionKey and thread subagent_id into metadata.
- Decision traces show subagent-originated events with yellow badges and indentation.
- Per-subagent rule scoping and per-subagent kill: roadmap (higher tier feature)

## Build SOON (this week)

### Monitoring Enhancements — Delayed
- PII detection in outputs — DELAYED, requires output monitoring (not just tool calls)
- Agent thinking/text output monitoring — DELAYED, privacy concerns, needs careful design
- Session replay — DELAYED, large effort, needs full session data
- Human review queue — medium effort, flag events for manual review

### Feedback Widget Redesign
- Resend-style: simple textarea + send button in nav
- Replace current floating chat bubble
- Keyboard shortcut (F)

### Mobile Responsive Fixes
- iPhone layout issues identified in screenshot
- Nav bar, text overflow, grid breakpoints

## Build LATER (roadmap)

### Remote Agent Messaging
- Inject messages into running agents mid-session via WebSocket
- Course-correct without killing
- Uses existing WebSocket channel

### Dashboard Control Bot
- Natural language commands to manage agents
- "Kill my deploy-assistant" or "Set rate limit of 10 emails/min"
- Pairs with rule template library

### Self-Evolving Rules
- Detect user frustration patterns → auto-propose rules
- "Your frustration becomes a rule"
- Pairs with control bot for one-click confirmation

### Per-Subagent Control (higher tier)
- Per-subagent kill switch (kill a runaway subagent without killing parent)
- Per-subagent metrics (cost, event count, rate) in dashboard
- Per-subagent rule scoping (apply different rules to different subagents)
- Tier: Pro or Team (decide later)
- NOTE: Base subagent mediation already works — all rules apply to all subagents. This is about granular per-subagent control.

### Anomaly-Triggered Auto-Kill (Week 2)
- Kill on critical behavioral deviation (not just rule violations)
- Needs 72h baseline data from beta testers first

### Community Threat Intelligence (Month 6)
- Opt-in cross-user anomaly patterns
- Users who enable data sharing see what patterns others hit
- Value exchange for the data sharing toggle

### EasyClaw — Agent Team Builder (Month 6-12)
- On-demand OpenClaw team generator
- Uses our learnings from building operator team
- Bundles free Clawnitor

### SaferClaw — Forked OpenClaw (Year 2+)
- Native Clawnitor embedded in runtime
- Open source (funnel) or proprietary (premium)

## Decisions Needed

- Subagent mediation: Pro tier or Team tier?
- Subagent hook registration: Can we register hooks on subagent sessions from subagent_spawning? Need to test with OpenClaw.
- Cost data: use OpenClaw's native cost_usd or calculate ourselves? (RESOLVED: using OpenClaw's native tracking)
- Decision traces: separate page or inline in dashboard? (RESOLVED: per-agent on agent detail page)
- Token attribution: show in event feed or separate cost page? (RESOLVED: cost cards + top events on dashboard)
- Human review queue: now or later?

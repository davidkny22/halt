import { readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { parseConfig } from "./config.js";
import { HttpsSender } from "./transport/https-sender.js";
import { JsonCache } from "./transport/json-cache.js";
import { WebSocketClient } from "./transport/websocket-client.js";
import { createRateTracker } from "./severity.js";
import { killState } from "./kill-switch/kill-state.js";
import { LocalFailsafe } from "./kill-switch/local-failsafe.js";
import { RuleCache } from "./rule-cache.js";
import { ViolationTracker } from "./auto-kill.js";
import { ShieldScanner } from "./shield/scanner.js";
import {
  createBeforeToolCallHandler,
  createAfterToolCallHandler,
} from "./hooks/tool-call.js";
import { createLlmInputHandler, createLlmOutputHandler } from "./hooks/llm.js";
import {
  createMessageSendingHandler,
  createMessageSentHandler,
  createMessageReceivedHandler,
} from "./hooks/message.js";
import {
  createSessionStartHandler,
  createSessionEndHandler,
  createAgentEndHandler,
  createSubagentHandlers,
} from "./hooks/lifecycle.js";

export default function register(api: any) {
  const rawConfig = api.pluginConfig || api.config || {};
  const config = parseConfig(rawConfig);
  const rateTracker = createRateTracker();
  const ruleCache = new RuleCache(config);

  // Per-agent failsafe (spend/rate isolated per agent in gateway mode)
  const failsafes = new Map<string, LocalFailsafe>();
  function getFailsafe(agentId: string): LocalFailsafe {
    let fs = failsafes.get(agentId);
    if (!fs) {
      fs = new LocalFailsafe(config);
      failsafes.set(agentId, fs);
    }
    return fs;
  }

  // Per-agent violation trackers (gateway mode: one plugin, many agents)
  const violationTrackers = new Map<string, ViolationTracker>();
  function getViolationTracker(agentId: string): ViolationTracker {
    let tracker = violationTrackers.get(agentId);
    if (!tracker) {
      const akConfig = ruleCache.getAutoKillConfig(agentId);
      tracker = new ViolationTracker(akConfig);
      violationTrackers.set(agentId, tracker);
    } else {
      // Sync config from backend on each access (config updates every 60s via rule cache)
      const akConfig = ruleCache.getAutoKillConfig(agentId);
      tracker.updateConfig(akConfig);
    }
    return tracker;
  }

  const cache = new JsonCache();

  const sender = new HttpsSender(config, {
    onAgentKillStates: (states) => {
      // Per-agent kill states from HTTPS response
      for (const [agentId, state] of Object.entries(states)) {
        if (state.killed && !killState.isKilled(agentId)) {
          killState.setKilled(state.reason || "Killed by server", agentId);
        } else if (!state.killed && killState.isKilled(agentId)) {
          killState.clearKilled(agentId);
        }
      }
    },
    onKillState: (killed, reason) => {
      // Backwards-compatible global fallback (only if agent_kill_states not present)
      if (killed && !killState.isKilled()) {
        killState.setKilled(reason || "Killed by server (HTTPS fallback)");
      } else if (!killed && killState.isKilled()) {
        killState.clearKilled();
      }
    },
    onFlushFail: (events) => {
      cache.cache(events);
    },
  });
  sender.start();

  const wsClient = new WebSocketClient(config, {
    onKill: (reason, _ruleId, agentId) => {
      killState.setKilled(reason, agentId);
    },
    onUnkill: (agentId) => {
      killState.clearKilled(agentId);
    },
  });
  wsClient.start();
  ruleCache.start();

  // Periodically flush cached events
  setInterval(() => {
    const cached = cache.flush(50);
    for (const event of cached) sender.enqueue(event);
  }, 30_000);

  // Per-agent session tracking: agentId → current session counter
  const agentSessionCounters = new Map<string, number>();

  // Resolve agent ID: prefer ctx.agentId (from OpenClaw), fall back to sessionKey parsing
  function resolveAgentId(event: any, ocCtx?: any): string {
    if (ocCtx?.agentId) return ocCtx.agentId;
    const sk = event?.sessionKey as string | undefined;
    if (sk && sk.startsWith("agent:")) {
      const parts = sk.split(":");
      if (parts.length >= 2 && parts[1]) return parts[1];
    }
    return rawConfig.agentId || "unknown";
  }

  // Resolve session ID: use ctx.sessionId if available, else build from agent + counter
  function resolveSessionId(event: any, ocCtx?: any, agentId?: string): string {
    // OpenClaw provides a session UUID when session_start fires
    if (ocCtx?.sessionId) return ocCtx.sessionId;
    // Use sessionKey if available (unique per agent session)
    const sk = event?.sessionKey || ocCtx?.sessionKey;
    if (sk) {
      const aid = agentId || resolveAgentId(event, ocCtx);
      const counter = agentSessionCounters.get(aid) || 0;
      return counter > 0 ? `${sk}:${counter}` : sk;
    }
    return "default";
  }

  // Mark session boundary on agent_end
  function onAgentEnd(agentId: string) {
    const current = agentSessionCounters.get(agentId) || 0;
    agentSessionCounters.set(agentId, current + 1);
    getFailsafe(agentId).resetSession();
  }

  const ctx = {
    get agentId() { return rawConfig.agentId || "unknown"; },
    get sessionId() { return "default"; },
    resolveAgentId,
    resolveSessionId,
    sender,
    rateTracker,
    redactionPatterns: config.redactionPatterns,
    getFailsafe,
    ruleCache,
    getViolationTracker,
    shieldScanner: new ShieldScanner(),
  };

  // Discover all agents from openclaw.json (fire-and-forget)
  discoverAgents(config).catch(() => {});

  // Register hooks — all handlers receive (event, ocCtx) from OpenClaw
  api.on("before_tool_call", createBeforeToolCallHandler(ctx), { priority: 10 });
  api.on("after_tool_call", createAfterToolCallHandler(ctx), { priority: 10 });
  api.on("llm_input", createLlmInputHandler(ctx), { priority: 10 });
  api.on("llm_output", createLlmOutputHandler(ctx), { priority: 10 });
  api.on("message_sending", createMessageSendingHandler(ctx), { priority: 10 });
  api.on("message_sent", createMessageSentHandler(ctx), { priority: 10 });
  api.on("message_received", createMessageReceivedHandler(ctx), { priority: 10 });
  api.on(
    "session_start",
    createSessionStartHandler({ ...ctx, onSessionStart: () => {} }),
    { priority: 10 }
  );
  api.on(
    "session_end",
    createSessionEndHandler(ctx),
    { priority: 10 }
  );
  api.on(
    "agent_end",
    createAgentEndHandler({ ...ctx, onAgentEnd }),
    { priority: 10 }
  );

  const subagent = createSubagentHandlers(ctx);
  api.on("subagent_spawning", subagent.spawning, { priority: 10 });
  api.on("subagent_ended", subagent.ended, { priority: 10 });

  // Inject visible rules into agent's system prompt (ctx has agentId)
  api.on("before_prompt_build", (_event: any, ocCtx: any) => {
    const agentId = ocCtx?.agentId;
    const rulesContext = ruleCache.getVisibleRulesContextForAgent(agentId);
    if (!rulesContext) return {};
    return { appendSystemContext: rulesContext };
  }, { priority: 10 });
}

async function discoverAgents(config: { apiKey: string; backendUrl: string }) {
  try {
    const configPath = join(homedir(), ".openclaw", "openclaw.json");
    const raw = readFileSync(configPath, "utf-8");
    const parsed = JSON.parse(raw);
    const agentList = parsed?.agents?.list;
    if (!Array.isArray(agentList) || agentList.length === 0) return;

    const agentIds = agentList
      .map((a: any) => a?.id)
      .filter((id: unknown): id is string => typeof id === "string" && id.length > 0);

    if (agentIds.length === 0) return;

    const tools = new Set<string>();
    for (const agent of agentList) {
      for (const t of agent?.tools?.deny || []) if (typeof t === "string") tools.add(t);
      for (const t of agent?.tools?.allow || []) if (typeof t === "string") tools.add(t);
    }

    const url = `${config.backendUrl}/api/agents/discover`;
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        agents: agentIds,
        tools: tools.size > 0 ? [...tools].sort() : undefined,
      }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    // Silent failure — discovery is best-effort
  }
}

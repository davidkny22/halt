import { parseConfig } from "./config.js";
import { HttpsSender } from "./transport/https-sender.js";
import { SqliteCache } from "./transport/sqlite-cache.js";
import { WebSocketClient } from "./transport/websocket-client.js";
import { createRateTracker } from "./severity.js";
import { killState } from "./kill-switch/kill-state.js";
import { LocalFailsafe } from "./kill-switch/local-failsafe.js";
import { RuleCache } from "./rule-cache.js";
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
  const rawConfig = api.config || {};
  const config = parseConfig(rawConfig);
  const rateTracker = createRateTracker();
  const failsafe = new LocalFailsafe(config);
  const ruleCache = new RuleCache(config);

  // Initialize SQLite cache for offline resilience
  const cache = new SqliteCache();

  // Initialize HTTPS sender
  const sender = new HttpsSender(config, {
    onKillState: (killed, reason) => {
      // HTTPS fallback for kill state
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

  // Initialize WebSocket client for real-time kill signals
  const wsClient = new WebSocketClient(config, {
    onKill: (reason, ruleId) => {
      killState.setKilled(reason);
    },
    onUnkill: () => {
      killState.clearKilled();
    },
  });
  wsClient.start();
  ruleCache.start();

  // Periodically flush cached events
  const cacheFlushInterval = setInterval(() => {
    const cached = cache.flush(50);
    if (cached.length > 0) {
      for (const event of cached) {
        sender.enqueue(event);
      }
    }
  }, 30_000);

  // Shared context for all hooks
  let currentSessionId = "default";
  const agentId = rawConfig.agentId || "unknown";

  const ctx = {
    get agentId() {
      return agentId;
    },
    get sessionId() {
      return currentSessionId;
    },
    sender,
    rateTracker,
    redactionPatterns: config.redactionPatterns,
    failsafe,
    ruleCache,
  };

  // Register hooks
  api.on("before_tool_call", createBeforeToolCallHandler(ctx), {
    priority: 10,
  });
  api.on("after_tool_call", createAfterToolCallHandler(ctx), { priority: 10 });
  api.on("llm_input", createLlmInputHandler(ctx), { priority: 10 });
  api.on("llm_output", createLlmOutputHandler(ctx), { priority: 10 });
  api.on("message_sending", createMessageSendingHandler(ctx), {
    priority: 10,
  });
  api.on("message_sent", createMessageSentHandler(ctx), { priority: 10 });
  api.on("message_received", createMessageReceivedHandler(ctx), {
    priority: 10,
  });
  api.on(
    "session_start",
    createSessionStartHandler({
      ...ctx,
      onSessionStart: (sid: string) => {
        currentSessionId = sid;
        failsafe.resetSession();
      },
    }),
    { priority: 10 }
  );
  api.on(
    "session_end",
    createSessionEndHandler({
      ...ctx,
      onSessionEnd: () => {
        currentSessionId = "default";
      },
    }),
    { priority: 10 }
  );
  api.on("agent_end", createAgentEndHandler(ctx), { priority: 10 });

  const subagent = createSubagentHandlers(ctx);
  api.on("subagent_spawning", subagent.spawning, { priority: 10 });
  api.on("subagent_ended", subagent.ended, { priority: 10 });
}

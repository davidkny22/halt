import type { HaltEvent, IngestEventsResponse } from "@halt/shared";
import { EVENT_BATCH_SIZE, EVENT_BATCH_INTERVAL_MS } from "@halt/shared";
import type { PluginConfig } from "../config.js";

export class HttpsSender {
  private buffer: HaltEvent[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private config: PluginConfig;
  private onKillState?: (killed: boolean, reason?: string) => void;
  private onAgentKillStates?: (states: Record<string, { killed: boolean; reason?: string }>) => void;
  private onFlushFail?: (events: HaltEvent[]) => void;

  constructor(
    config: PluginConfig,
    opts?: {
      onKillState?: (killed: boolean, reason?: string) => void;
      onAgentKillStates?: (states: Record<string, { killed: boolean; reason?: string }>) => void;
      onFlushFail?: (events: HaltEvent[]) => void;
    }
  ) {
    this.config = config;
    this.onKillState = opts?.onKillState;
    this.onAgentKillStates = opts?.onAgentKillStates;
    this.onFlushFail = opts?.onFlushFail;
  }

  start() {
    this.timer = setInterval(() => this.flush(), EVENT_BATCH_INTERVAL_MS);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    // Final flush
    this.flush();
  }

  enqueue(event: HaltEvent) {
    this.buffer.push(event);
    if (this.buffer.length >= EVENT_BATCH_SIZE) {
      this.flush();
    }
  }

  private async flush() {
    if (this.buffer.length === 0) return;

    const batch = this.buffer.splice(0, EVENT_BATCH_SIZE);

    try {
      const response = await fetch(`${this.config.backendUrl}/api/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({ events: batch }),
        signal: AbortSignal.timeout(10_000),
      });

      if (response.ok) {
        const data = (await response.json()) as any;
        // Per-agent kill states (plugin 2.2+)
        if (data.agent_kill_states && this.onAgentKillStates) {
          this.onAgentKillStates(data.agent_kill_states);
        } else if (this.onKillState && data.kill_state) {
          // Backwards-compatible global kill state
          this.onKillState(data.kill_state.killed, data.kill_state.reason);
        }
      } else if (response.status === 401 || response.status === 403) {
        // Auth failure — log loudly, don't retry (key is wrong)
        console.error(`[halt] API key rejected (${response.status}). Check your apiKey in openclaw.json. Events are being dropped.`);
      } else if (response.status >= 500) {
        // Server error — cache for retry
        this.onFlushFail?.(batch);
      } else {
        // Other 4xx — log and drop
        console.warn(`[halt] Event send failed (${response.status}). Events dropped.`);
      }
    } catch (err) {
      // Network error — cache for retry
      console.warn(`[halt] Cannot reach ${this.config.backendUrl} — caching events for retry.`);
      this.onFlushFail?.(batch);
    }
  }
}

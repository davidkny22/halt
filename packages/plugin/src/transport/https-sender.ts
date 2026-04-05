import type { ClawnitorEvent, IngestEventsResponse } from "@clawnitor/shared";
import { EVENT_BATCH_SIZE, EVENT_BATCH_INTERVAL_MS } from "@clawnitor/shared";
import type { PluginConfig } from "../config.js";

export class HttpsSender {
  private buffer: ClawnitorEvent[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private config: PluginConfig;
  private onKillState?: (killed: boolean, reason?: string) => void;
  private onFlushFail?: (events: ClawnitorEvent[]) => void;

  constructor(
    config: PluginConfig,
    opts?: {
      onKillState?: (killed: boolean, reason?: string) => void;
      onFlushFail?: (events: ClawnitorEvent[]) => void;
    }
  ) {
    this.config = config;
    this.onKillState = opts?.onKillState;
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

  enqueue(event: ClawnitorEvent) {
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
        const data = (await response.json()) as IngestEventsResponse;
        if (this.onKillState) {
          this.onKillState(data.kill_state.killed, data.kill_state.reason);
        }
      } else if (response.status >= 500) {
        // Server error — cache for retry
        this.onFlushFail?.(batch);
      }
      // 4xx errors are dropped (bad data, auth issues)
    } catch {
      // Network error — cache for retry
      this.onFlushFail?.(batch);
    }
  }
}

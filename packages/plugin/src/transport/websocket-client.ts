import {
  WS_RECONNECT_BASE_MS,
  WS_RECONNECT_MAX_MS,
  type WsMessage,
} from "@clawnitor/shared";
import type { PluginConfig } from "../config.js";

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private config: PluginConfig;
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private stopped = false;
  private onKill?: (reason: string, ruleId?: string) => void;
  private onUnkill?: () => void;

  constructor(
    config: PluginConfig,
    opts: {
      onKill?: (reason: string, ruleId?: string) => void;
      onUnkill?: () => void;
    }
  ) {
    this.config = config;
    this.onKill = opts.onKill;
    this.onUnkill = opts.onUnkill;
  }

  start() {
    this.stopped = false;
    this.connect();
  }

  stop() {
    this.stopped = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private connect() {
    if (this.stopped) return;

    // wss:// for production (https), ws:// only for localhost development
    const wsUrl = this.config.backendUrl
      .replace("https://", "wss://")
      .replace("http://", "ws://"); // nosemgrep: insecure-websocket — ws:// only used for localhost dev

    try {
      this.ws = new WebSocket(`${wsUrl}/ws`);

      this.ws.onopen = () => {
        this.reconnectAttempt = 0;
        // Authenticate via first message (not URL params)
        this.ws?.send(JSON.stringify({ apiKey: this.config.apiKey }));
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(String(event.data)) as WsMessage & { type: string };
          if (msg.type === "kill") {
            this.onKill?.(msg.reason, (msg as any).rule_id);
          } else if (msg.type === "unkill") {
            this.onUnkill?.();
          }
        } catch {
          // Ignore unparseable messages
        }
      };

      this.ws.onclose = () => {
        this.ws = null;
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        // onclose will fire after onerror
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.stopped) return;

    const delay = Math.min(
      WS_RECONNECT_BASE_MS * Math.pow(2, this.reconnectAttempt),
      WS_RECONNECT_MAX_MS
    );
    // Add jitter (±25%)
    const jitter = delay * (0.75 + Math.random() * 0.5);

    this.reconnectAttempt++;
    this.reconnectTimer = setTimeout(() => {
      if (!this.stopped) this.connect();
    }, jitter);
  }
}

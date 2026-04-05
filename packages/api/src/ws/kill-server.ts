import type { FastifyInstance } from "fastify";
import type { WebSocket } from "@fastify/websocket";
import { eq, and, isNull } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { apiKeys } from "../db/schema.js";
import { verifyApiKey } from "../auth/api-key.js";
import { WS_HEARTBEAT_INTERVAL_MS } from "@clawnitor/shared";
import type { KillMessage, UnkillMessage } from "@clawnitor/shared";

const connections = new Map<string, Set<WebSocket>>();
const AUTH_TIMEOUT_MS = 10_000;
const MAX_WS_PAYLOAD = 4096;
const MAX_CONNECTIONS_PER_USER = 20;
const MAX_PRE_AUTH_MESSAGES = 3;

export async function killServerRoutes(app: FastifyInstance) {
  app.get("/ws", { websocket: true }, async (socket, request) => {
    // Auth via first message (not URL params — avoids key in server logs)
    let authenticated = false;
    let userId: string | null = null;
    let preAuthMessageCount = 0;

    const authTimeout = setTimeout(() => {
      if (!authenticated) {
        socket.close(4001, "Authentication timeout — send API key as first message");
      }
    }, AUTH_TIMEOUT_MS);

    socket.on("message", async (data: any) => {
      // Reject oversized messages
      const msg = String(data);
      if (msg.length > MAX_WS_PAYLOAD) {
        socket.close(4008, "Message too large");
        return;
      }

      if (!authenticated) {
        preAuthMessageCount++;
        if (preAuthMessageCount > MAX_PRE_AUTH_MESSAGES) {
          socket.close(4008, "Too many pre-auth messages");
          return;
        }

        // First message must be the API key
        clearTimeout(authTimeout);

        try {
          const parsed = JSON.parse(msg);
          const apiKey = parsed.apiKey || parsed.key || msg;
          userId = await authenticateWs(typeof apiKey === "string" ? apiKey : "");
        } catch {
          // If not JSON, treat the entire message as the API key
          userId = await authenticateWs(msg.trim());
        }

        if (!userId) {
          socket.close(4003, "Invalid API key");
          return;
        }

        authenticated = true;

        // Enforce per-user connection limit
        const existingConns = connections.get(userId);
        if (existingConns && existingConns.size >= MAX_CONNECTIONS_PER_USER) {
          socket.close(4009, "Too many connections");
          return;
        }

        // Register connection
        if (!connections.has(userId)) {
          connections.set(userId, new Set());
        }
        connections.get(userId)!.add(socket);

        // Confirm auth (no userId leaked)
        socket.send(JSON.stringify({ type: "connected" }));

        // Start heartbeat
        const heartbeat = setInterval(() => {
          if (socket.readyState === socket.OPEN) {
            socket.ping();
          }
        }, WS_HEARTBEAT_INTERVAL_MS);

        socket.on("close", () => {
          clearInterval(heartbeat);
          const userConns = connections.get(userId!);
          if (userConns) {
            userConns.delete(socket);
            if (userConns.size === 0) {
              connections.delete(userId!);
            }
          }
        });

        socket.on("error", () => {
          clearInterval(heartbeat);
        });

        return;
      }

      // After auth, ignore client messages (server→client only)
    });
  });
}

async function authenticateWs(raw: string): Promise<string | null> {
  if (!raw || raw.length < 16) return null;
  const prefix = raw.slice(0, 16);
  const db = getDb();

  const keys = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.prefix, prefix), isNull(apiKeys.revoked_at)));

  for (const key of keys) {
    const valid = await verifyApiKey(raw, key.key_hash);
    if (valid) return key.user_id;
  }

  return null;
}

export function sendKill(userId: string, reason: string, ruleId?: string): boolean {
  const userConns = connections.get(userId);
  if (!userConns || userConns.size === 0) return false;

  const message: KillMessage = { type: "kill", reason, rule_id: ruleId };
  const payload = JSON.stringify(message);

  for (const socket of userConns) {
    if (socket.readyState === socket.OPEN) {
      socket.send(payload);
    }
  }

  return true;
}

export function sendUnkill(userId: string): boolean {
  const userConns = connections.get(userId);
  if (!userConns || userConns.size === 0) return false;

  const message: UnkillMessage = { type: "unkill" };
  const payload = JSON.stringify(message);

  for (const socket of userConns) {
    if (socket.readyState === socket.OPEN) {
      socket.send(payload);
    }
  }

  return true;
}

export function getConnectionCount(userId: string): number {
  return connections.get(userId)?.size ?? 0;
}

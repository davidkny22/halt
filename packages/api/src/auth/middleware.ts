import type { FastifyRequest, FastifyReply } from "fastify";
import { eq, and, isNull } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { apiKeys } from "../db/schema.js";
import { verifyApiKey } from "./api-key.js";

declare module "fastify" {
  interface FastifyRequest {
    userId?: string;
  }
}

export async function authenticateApiKey(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return reply.status(401).send({ error: "Unauthorized", message: "Missing or invalid Authorization header" });
  }

  const raw = authHeader.slice(7);
  const prefix = raw.slice(0, 16);
  const db = getDb();

  const keys = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.prefix, prefix), isNull(apiKeys.revoked_at)));

  for (const key of keys) {
    const valid = await verifyApiKey(raw, key.key_hash);
    if (valid) {
      // Allow rotated keys for 24h grace period
      if (key.rotated_at) {
        const grace = 24 * 60 * 60 * 1000;
        if (Date.now() - key.rotated_at.getTime() > grace) {
          continue;
        }
      }
      request.userId = key.user_id;
      return;
    }
  }

  return reply.status(401).send({ error: "Unauthorized", message: "Invalid API key" });
}

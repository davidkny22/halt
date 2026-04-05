import type { FastifyRequest, FastifyReply } from "fastify";
import { eq, and, isNull } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { apiKeys, users } from "../db/schema.js";
import { verifyApiKey } from "./api-key.js";
import { getConfig } from "../config.js";
import { timingSafeEqual } from "node:crypto";

declare module "fastify" {
  interface FastifyRequest {
    userId?: string;
  }
}

// Plugin API key auth — for OpenClaw plugin → API calls
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

// Internal auth — for dashboard server → API calls
// Validates INTERNAL_API_SECRET + resolves user by email in X-User-Email header
export async function authenticateInternal(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const secret = request.headers["x-internal-secret"] as string;
  const email = request.headers["x-user-email"] as string;
  const config = getConfig();

  if (!config.INTERNAL_API_SECRET) {
    return reply.status(500).send({ error: "Internal auth not configured" });
  }

  if (!secret) {
    return reply.status(401).send({ error: "Unauthorized" });
  }
  try {
    const secretBuf = Buffer.from(secret);
    const expectedBuf = Buffer.from(config.INTERNAL_API_SECRET);
    if (secretBuf.length !== expectedBuf.length || !timingSafeEqual(secretBuf, expectedBuf)) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
  } catch {
    return reply.status(401).send({ error: "Unauthorized" });
  }

  if (!email) {
    return reply.status(400).send({ error: "X-User-Email header required" });
  }

  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.email, email));

  if (!user) {
    return reply.status(404).send({ error: "User not found" });
  }

  request.userId = user.id;
}

// Either auth — accepts API key OR internal secret
export async function authenticateAny(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const hasApiKey = request.headers.authorization?.startsWith("Bearer ");
  const hasInternal = request.headers["x-internal-secret"];

  if (hasApiKey) {
    return authenticateApiKey(request, reply);
  }
  if (hasInternal) {
    return authenticateInternal(request, reply);
  }

  return reply.status(401).send({ error: "Unauthorized" });
}

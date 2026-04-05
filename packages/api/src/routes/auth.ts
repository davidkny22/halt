import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { users, apiKeys } from "../db/schema.js";
import { generateApiKey, hashApiKey } from "../auth/api-key.js";
import { RateLimiter } from "../util/rate-limiter.js";
import { getConfig } from "../config.js";
import { timingSafeEqual } from "node:crypto";

const authRateLimiter = new RateLimiter(10, 10); // 10 req/min

function validateInternalSecret(request: any): boolean {
  const config = getConfig();
  if (!config.INTERNAL_API_SECRET) return false;
  const secret = request.headers["x-internal-secret"] as string;
  if (!secret) return false;
  try {
    const secretBuf = Buffer.from(secret);
    const expectedBuf = Buffer.from(config.INTERNAL_API_SECRET);
    return secretBuf.length === expectedBuf.length && timingSafeEqual(secretBuf, expectedBuf);
  } catch {
    return false;
  }
}

export async function authRoutes(app: FastifyInstance) {
  // Called by dashboard after GitHub OAuth — creates or finds user, returns API key
  // Requires INTERNAL_API_SECRET — only the dashboard backend should call this
  app.post("/api/auth/provision", {
    handler: async (request, reply) => {
      if (!validateInternalSecret(request)) {
        return reply.status(401).send({ error: "Unauthorized" });
      }

      const ip = request.ip;
      if (!authRateLimiter.consume(ip)) {
        return reply.status(429).send({ error: "Too many requests" });
      }
      const { email, github_id, name } = request.body as {
        email: string;
        github_id?: string;
        name?: string;
      };

      if (!email) {
        return reply.status(400).send({ error: "email required" });
      }

      const db = getDb();

      // Find or create user
      let [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email));

      if (!user) {
        [user] = await db
          .insert(users)
          .values({
            email,
            github_id: github_id || null,
            email_verified: true,
            tier: "free",
          })
          .returning();
      }

      // Check if user already has an active API key
      const existingKeys = await db
        .select()
        .from(apiKeys)
        .where(eq(apiKeys.user_id, user.id));

      const activeKey = existingKeys.find((k) => !k.revoked_at);

      if (activeKey) {
        // Return existing key prefix — user needs to use their stored key
        return reply.send({
          user_id: user.id,
          tier: user.tier,
          has_key: true,
          key_prefix: activeKey.prefix,
        });
      }

      // Generate new API key
      const { raw, prefix } = generateApiKey();
      const keyHash = await hashApiKey(raw);

      await db.insert(apiKeys).values({
        user_id: user.id,
        key_hash: keyHash,
        prefix,
      });

      return reply.send({
        user_id: user.id,
        tier: user.tier,
        has_key: true,
        api_key: raw, // Only returned on first creation
        key_prefix: prefix,
      });
    },
  });

  // Get user info by email (for dashboard session enrichment)
  // Requires INTERNAL_API_SECRET — only the dashboard backend should call this
  app.get("/api/auth/me", {
    handler: async (request, reply) => {
      if (!validateInternalSecret(request)) {
        return reply.status(401).send({ error: "Unauthorized" });
      }

      const ip = request.ip;
      if (!authRateLimiter.consume(ip)) {
        return reply.status(429).send({ error: "Too many requests" });
      }

      const email = (request.query as { email?: string }).email;
      if (!email) {
        return reply.status(400).send({ error: "email required" });
      }

      const db = getDb();
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email));

      if (!user) {
        return reply.status(404).send({ error: "User not found" });
      }

      const keys = await db
        .select()
        .from(apiKeys)
        .where(eq(apiKeys.user_id, user.id));

      const activeKey = keys.find((k) => !k.revoked_at);

      return reply.send({
        user_id: user.id,
        email: user.email,
        tier: user.tier,
        has_key: !!activeKey,
        key_prefix: activeKey?.prefix,
        data_sharing_enabled: user.data_sharing_enabled,
        created_at: user.created_at,
      });
    },
  });
}

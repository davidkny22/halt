import type { FastifyInstance } from "fastify";
import { eq, and } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { users, apiKeys, agents, events, rules, alerts, baselines, alertChannels } from "../db/schema.js";
import { authenticateAny as authenticateApiKey } from "../auth/middleware.js";
import { generateApiKey, hashApiKey } from "../auth/api-key.js";
import { logAudit } from "./enterprise.js";

export async function accountRoutes(app: FastifyInstance) {
  // Set rule visibility mode
  app.put("/api/account/rule-visibility", {
    preHandler: [authenticateApiKey],
    handler: async (request, reply) => {
      const { rule_visibility } = request.body as { rule_visibility: string };
      if (!["all_visible", "per_rule", "all_silent"].includes(rule_visibility)) {
        return reply.status(400).send({ error: "Invalid visibility mode" });
      }
      const db = getDb();
      await db
        .update(users)
        .set({ rule_visibility, updated_at: new Date() })
        .where(eq(users.id, request.userId!));

      return reply.send({ rule_visibility });
    },
  });

  // Toggle data sharing
  app.put("/api/account/data-sharing", {
    preHandler: [authenticateApiKey],
    handler: async (request, reply) => {
      const { enabled } = request.body as { enabled: boolean };
      const db = getDb();

      await db
        .update(users)
        .set({ data_sharing_enabled: enabled, updated_at: new Date() })
        .where(eq(users.id, request.userId!));

      await logAudit({ userId: request.userId!, action: "settings.data_sharing", resourceType: "settings", details: { enabled }, ipAddress: request.ip });
      return reply.send({ data_sharing_enabled: enabled });
    },
  });

  // Rotate API key (old key valid for 24h)
  app.post("/api/account/rotate-key", {
    preHandler: [authenticateApiKey],
    handler: async (request, reply) => {
      const db = getDb();
      const userId = request.userId!;

      // Mark current keys as rotated
      const currentKeys = await db
        .select()
        .from(apiKeys)
        .where(eq(apiKeys.user_id, userId));

      for (const key of currentKeys) {
        if (!key.revoked_at && !key.rotated_at) {
          await db
            .update(apiKeys)
            .set({ rotated_at: new Date() })
            .where(eq(apiKeys.id, key.id));
        }
      }

      // Generate new key
      const { raw, prefix } = generateApiKey();
      const keyHash = await hashApiKey(raw);

      await db.insert(apiKeys).values({
        user_id: userId,
        key_hash: keyHash,
        prefix,
      });

      await logAudit({ userId, action: "api_key.rotated", resourceType: "api_key", ipAddress: request.ip });

      return reply.send({
        api_key: raw,
        key_prefix: prefix,
        message: "New key created. Old key will continue working for 24 hours.",
      });
    },
  });

  // List all API keys (names, prefixes, status — never hashes)
  app.get("/api/account/keys", {
    preHandler: [authenticateApiKey],
    handler: async (request, reply) => {
      const db = getDb();
      const userId = request.userId!;

      const keys = await db
        .select({
          id: apiKeys.id,
          name: apiKeys.name,
          prefix: apiKeys.prefix,
          last_used_at: apiKeys.last_used_at,
          rotated_at: apiKeys.rotated_at,
          revoked_at: apiKeys.revoked_at,
          created_at: apiKeys.created_at,
        })
        .from(apiKeys)
        .where(eq(apiKeys.user_id, userId))
        .orderBy(apiKeys.created_at);

      return reply.send({
        keys: keys.map((k) => ({
          ...k,
          status: k.revoked_at ? "revoked" : k.rotated_at ? "rotated" : "active",
        })),
      });
    },
  });

  // Create a new named API key
  app.post("/api/account/keys", {
    preHandler: [authenticateApiKey],
    handler: async (request, reply) => {
      const db = getDb();
      const userId = request.userId!;
      const { name } = request.body as { name?: string };

      // Check tier limits
      const user = await db.select().from(users).where(eq(users.id, userId));
      const tier = user[0]?.tier || "free";
      const activeKeys = await db
        .select()
        .from(apiKeys)
        .where(eq(apiKeys.user_id, userId));
      const activeCount = activeKeys.filter((k) => !k.revoked_at).length;

      const maxKeys = tier === "free" ? 2 : 100;
      if (activeCount >= maxKeys) {
        return reply.status(403).send({
          error: `Maximum ${maxKeys} active keys for ${tier} tier`,
        });
      }

      const { raw, prefix } = generateApiKey();
      const keyHash = await hashApiKey(raw);

      await db.insert(apiKeys).values({
        user_id: userId,
        name: name?.slice(0, 64) || "Untitled",
        key_hash: keyHash,
        prefix,
      });

      return reply.send({
        api_key: raw,
        prefix,
        name: name || "Untitled",
        message: "Key created. Save this key — it won't be shown again.",
      });
    },
  });

  // Rename a key
  app.put("/api/account/keys/:keyId", {
    preHandler: [authenticateApiKey],
    handler: async (request, reply) => {
      const db = getDb();
      const userId = request.userId!;
      const { keyId } = request.params as { keyId: string };
      const { name } = request.body as { name: string };

      if (!name) {
        return reply.status(400).send({ error: "name required" });
      }

      const [updated] = await db
        .update(apiKeys)
        .set({ name: name.slice(0, 64) })
        .where(and(eq(apiKeys.id, keyId), eq(apiKeys.user_id, userId)))
        .returning();

      if (!updated) {
        return reply.status(404).send({ error: "Key not found" });
      }

      return reply.send({ id: updated.id, name: updated.name });
    },
  });

  // Revoke a key
  app.delete("/api/account/keys/:keyId", {
    preHandler: [authenticateApiKey],
    handler: async (request, reply) => {
      const db = getDb();
      const userId = request.userId!;
      const { keyId } = request.params as { keyId: string };

      // Don't let user revoke their last active key
      const allKeys = await db
        .select()
        .from(apiKeys)
        .where(eq(apiKeys.user_id, userId));
      const activeKeys = allKeys.filter((k) => !k.revoked_at);

      if (activeKeys.length <= 1) {
        return reply.status(400).send({
          error: "Cannot revoke your last active key",
        });
      }

      const [revoked] = await db
        .update(apiKeys)
        .set({ revoked_at: new Date() })
        .where(and(eq(apiKeys.id, keyId), eq(apiKeys.user_id, userId)))
        .returning();

      if (!revoked) {
        return reply.status(404).send({ error: "Key not found" });
      }

      return reply.send({ id: revoked.id, status: "revoked" });
    },
  });

  // Get alert channels
  app.get("/api/account/alert-channels", {
    preHandler: [authenticateApiKey],
    handler: async (request, reply) => {
      const db = getDb();
      const channels = await db
        .select()
        .from(alertChannels)
        .where(eq(alertChannels.user_id, request.userId!));
      return reply.send({ channels });
    },
  });

  // Upsert alert channel
  app.put("/api/account/alert-channels/:channel", {
    preHandler: [authenticateApiKey],
    handler: async (request, reply) => {
      const { channel } = request.params as { channel: string };
      const { config, enabled } = request.body as { config: Record<string, string>; enabled?: boolean };
      const db = getDb();

      if (!["telegram", "discord", "sms"].includes(channel)) {
        return reply.status(400).send({ error: "Invalid channel" });
      }

      if (config && JSON.stringify(config).length > 10_000) {
        return reply.status(400).send({ error: "Config too large" });
      }

      // Check if channel exists
      const [existing] = await db
        .select()
        .from(alertChannels)
        .where(
          and(
            eq(alertChannels.user_id, request.userId!),
            eq(alertChannels.channel, channel as any)
          )
        );

      if (existing) {
        await db
          .update(alertChannels)
          .set({ config, enabled: enabled ?? true, updated_at: new Date() })
          .where(eq(alertChannels.id, existing.id));
      } else {
        await db.insert(alertChannels).values({
          user_id: request.userId!,
          channel: channel as any,
          config,
          enabled: enabled ?? true,
        });
      }

      await logAudit({ userId: request.userId!, action: `alert_channel.${channel}.configured`, resourceType: "settings", details: { channel, enabled: enabled ?? true }, ipAddress: request.ip });
      return reply.send({ channel, configured: true, enabled: enabled ?? true });
    },
  });

  // Delete alert channel
  app.delete("/api/account/alert-channels/:channel", {
    preHandler: [authenticateApiKey],
    handler: async (request, reply) => {
      const { channel } = request.params as { channel: string };
      const db = getDb();

      await db
        .delete(alertChannels)
        .where(
          and(
            eq(alertChannels.user_id, request.userId!),
            eq(alertChannels.channel, channel as any)
          )
        );

      return reply.send({ channel, deleted: true });
    },
  });

  // Delete account
  app.delete("/api/account", {
    preHandler: [authenticateApiKey],
    handler: async (request, reply) => {
      const db = getDb();
      const userId = request.userId!;

      // Audit log BEFORE deletion (FK cascade would delete it after)
      await logAudit({ userId, action: "account.deleted", resourceType: "account", ipAddress: request.ip });

      // Delete all user data
      await db.delete(baselines).where(eq(baselines.user_id, userId));
      await db.delete(alerts).where(eq(alerts.user_id, userId));
      await db.delete(rules).where(eq(rules.user_id, userId));
      await db.delete(events).where(eq(events.user_id, userId));
      await db.delete(agents).where(eq(agents.user_id, userId));
      await db.delete(apiKeys).where(eq(apiKeys.user_id, userId));
      await db.delete(users).where(eq(users.id, userId));
      return reply.send({ deleted: true });
    },
  });
}

import type { FastifyInstance } from "fastify";
import { eq, and } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { users, apiKeys, agents, events, rules, alerts, baselines, alertChannels } from "../db/schema.js";
import { authenticateAny as authenticateApiKey } from "../auth/middleware.js";
import { generateApiKey, hashApiKey } from "../auth/api-key.js";
import { logAudit } from "./enterprise.js";

export async function accountRoutes(app: FastifyInstance) {
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

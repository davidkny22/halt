import type { FastifyInstance } from "fastify";
import { eq, and, desc, count } from "drizzle-orm";
import { z } from "zod";
import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";
import { getDb } from "../db/client.js";
import { logger } from "../util/logger.js";
import {
  auditLogs,
  customWebhooks,
  ssoConfigs,
  teams,
  users,
} from "../db/schema.js";
import { authenticateAny as authenticateApiKey } from "../auth/middleware.js";
import { TIER_FEATURES, type Tier } from "@clawnitor/shared";
import { getConfig } from "../config.js";
import { validateWebhookUrl } from "../alerts/webhook.js";

function requireEnterprise(tier: string): boolean {
  return tier === "enterprise";
}

// ── Audit Log Helper ──────────────────────────────────────

export async function logAudit(params: {
  teamId?: string;
  userId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}) {
  const db = getDb();
  await db.insert(auditLogs).values({
    team_id: params.teamId || null,
    user_id: params.userId,
    action: params.action,
    resource_type: params.resourceType,
    resource_id: params.resourceId || null,
    details: params.details || null,
    ip_address: params.ipAddress || null,
  });
}

// ── SSO Encryption Helpers ────────────────────────────────

function getEncryptionKey(): Buffer {
  const key = process.env.SSO_ENCRYPTION_KEY;
  if (!key || key.length !== 64) {
    throw new Error("SSO_ENCRYPTION_KEY must be a 64-character hex string (32 bytes). SSO features are unavailable.");
  }
  return Buffer.from(key, "hex");
}

function encrypt(text: string): string {
  const iv = randomBytes(16);
  const key = getEncryptionKey();
  const cipher = createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

function decrypt(encrypted: string): string {
  try {
    const parts = encrypted.split(":");
    if (parts.length !== 2) throw new Error("Invalid encrypted format");
    const [ivHex, encHex] = parts;
    const iv = Buffer.from(ivHex, "hex");
    const key = getEncryptionKey();
    const decipher = createDecipheriv("aes-256-cbc", key, iv);
    let decrypted = decipher.update(encHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch {
    logger.error("SSO secret decryption failed");
    return "";
  }
}

// ── Routes ────────────────────────────────────────────────

export async function enterpriseRoutes(app: FastifyInstance) {
  // ── Audit Logs ──────────────────────────────────────────

  app.get("/api/audit-logs", {
    preHandler: [authenticateApiKey],
    handler: async (request, reply) => {
      const db = getDb();
      const userId = request.userId!;
      const query = request.query as {
        team_id?: string;
        limit?: string;
        offset?: string;
      };

      // Check enterprise tier
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId));

      if (!TIER_FEATURES[(user?.tier || "free") as Tier]?.auditLogs) {
        return reply.status(403).send({
          error: "Enterprise feature",
          message: "Audit logs require an Enterprise plan.",
        });
      }

      const limit = Math.min(parseInt(query.limit || "50", 10) || 50, 200);
      const offset = Math.max(parseInt(query.offset || "0", 10) || 0, 0);

      const conditions = [eq(auditLogs.user_id, userId)];
      if (query.team_id) {
        conditions.push(eq(auditLogs.team_id, query.team_id));
      }

      const logs = await db
        .select()
        .from(auditLogs)
        .where(and(...conditions))
        .orderBy(desc(auditLogs.created_at))
        .limit(limit)
        .offset(offset);

      return reply.send({ audit_logs: logs, limit, offset });
    },
  });

  // ── Custom Webhooks ─────────────────────────────────────

  const createWebhookBody = z.object({
    name: z.string().min(1).max(255),
    url: z.string().url(),
    events: z.array(z.string()).min(1),
    secret: z.string().optional(),
  });

  app.get("/api/webhooks", {
    preHandler: [authenticateApiKey],
    handler: async (request, reply) => {
      const db = getDb();
      const userId = request.userId!;

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId));

      if (!TIER_FEATURES[(user?.tier || "free") as Tier]?.customWebhooks) {
        return reply.status(403).send({
          error: "Enterprise feature",
          message: "Custom webhooks require an Enterprise plan.",
        });
      }

      const webhooks = await db
        .select()
        .from(customWebhooks)
        .where(eq(customWebhooks.user_id, userId));

      return reply.send({ webhooks });
    },
  });

  app.post("/api/webhooks", {
    preHandler: [authenticateApiKey],
    handler: async (request, reply) => {
      const parsed = createWebhookBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: "Invalid webhook configuration" });
      }

      // SSRF prevention
      const urlCheck = validateWebhookUrl(parsed.data.url);
      if (!urlCheck.valid) {
        return reply.status(400).send({ error: urlCheck.reason });
      }

      const db = getDb();
      const userId = request.userId!;

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId));

      if (!TIER_FEATURES[(user?.tier || "free") as Tier]?.customWebhooks) {
        return reply.status(403).send({
          error: "Enterprise feature",
          message: "Custom webhooks require an Enterprise plan.",
        });
      }

      const [webhook] = await db
        .insert(customWebhooks)
        .values({
          user_id: userId,
          name: parsed.data.name,
          url: parsed.data.url,
          events: parsed.data.events,
          secret: parsed.data.secret || randomBytes(32).toString("hex"),
        })
        .returning();

      await logAudit({
        userId,
        action: "webhook.created",
        resourceType: "webhook",
        resourceId: webhook.id,
        details: { name: parsed.data.name, url: parsed.data.url },
        ipAddress: request.ip,
      });

      return reply.status(201).send(webhook);
    },
  });

  app.delete("/api/webhooks/:id", {
    preHandler: [authenticateApiKey],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const db = getDb();
      const userId = request.userId!;

      const deleted = await db
        .delete(customWebhooks)
        .where(
          and(eq(customWebhooks.id, id), eq(customWebhooks.user_id, userId))
        )
        .returning();

      if (deleted.length === 0) {
        return reply.status(404).send({ error: "Webhook not found" });
      }

      await logAudit({
        userId,
        action: "webhook.deleted",
        resourceType: "webhook",
        resourceId: id,
        ipAddress: request.ip,
      });

      return reply.send({ deleted: true });
    },
  });

  // ── SSO Configuration ───────────────────────────────────

  app.get("/api/sso", {
    preHandler: [authenticateApiKey],
    handler: async (request, reply) => {
      const db = getDb();
      const userId = request.userId!;

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId));

      if (!TIER_FEATURES[(user?.tier || "free") as Tier]?.sso) {
        return reply.status(403).send({
          error: "Enterprise feature",
          message: "SSO/SAML requires an Enterprise plan.",
        });
      }

      // Find user's team SSO config
      const teamResults = await db
        .select()
        .from(teams)
        .where(eq(teams.owner_id, userId));

      if (teamResults.length === 0) {
        return reply.send({ sso: null, message: "Create a team first to configure SSO." });
      }

      const [config] = await db
        .select()
        .from(ssoConfigs)
        .where(eq(ssoConfigs.team_id, teamResults[0].id));

      if (!config) {
        return reply.send({ sso: null });
      }

      // Don't return the encrypted secret
      return reply.send({
        sso: {
          id: config.id,
          provider: config.provider,
          issuer_url: config.issuer_url,
          client_id: config.client_id,
          metadata_url: config.metadata_url,
          enabled: config.enabled,
          created_at: config.created_at,
        },
      });
    },
  });

  const ssoConfigBody = z.object({
    provider: z.enum(["okta", "azure_ad", "google", "onelogin", "custom"]),
    issuer_url: z.string().url(),
    client_id: z.string().min(1),
    client_secret: z.string().min(1),
    metadata_url: z.string().url().optional(),
  });

  app.post("/api/sso", {
    preHandler: [authenticateApiKey],
    handler: async (request, reply) => {
      const parsed = ssoConfigBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: "Invalid SSO configuration" });
      }

      const db = getDb();
      const userId = request.userId!;

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId));

      if (!TIER_FEATURES[(user?.tier || "free") as Tier]?.sso) {
        return reply.status(403).send({
          error: "Enterprise feature",
          message: "SSO/SAML requires an Enterprise plan.",
        });
      }

      const teamResults = await db
        .select()
        .from(teams)
        .where(eq(teams.owner_id, userId));

      if (teamResults.length === 0) {
        return reply.status(400).send({ error: "Create a team first." });
      }

      const teamId = teamResults[0].id;

      // Encrypt the client secret
      const encryptedSecret = encrypt(parsed.data.client_secret);

      // Upsert SSO config
      const existing = await db
        .select()
        .from(ssoConfigs)
        .where(eq(ssoConfigs.team_id, teamId));

      if (existing.length > 0) {
        await db
          .update(ssoConfigs)
          .set({
            provider: parsed.data.provider,
            issuer_url: parsed.data.issuer_url,
            client_id: parsed.data.client_id,
            client_secret_encrypted: encryptedSecret,
            metadata_url: parsed.data.metadata_url || null,
            updated_at: new Date(),
          })
          .where(eq(ssoConfigs.team_id, teamId));
      } else {
        await db.insert(ssoConfigs).values({
          team_id: teamId,
          provider: parsed.data.provider,
          issuer_url: parsed.data.issuer_url,
          client_id: parsed.data.client_id,
          client_secret_encrypted: encryptedSecret,
          metadata_url: parsed.data.metadata_url || null,
        });
      }

      await logAudit({
        userId,
        teamId,
        action: "sso.configured",
        resourceType: "sso",
        details: { provider: parsed.data.provider },
        ipAddress: request.ip,
      });

      return reply.send({
        message: "SSO configured. Enable it when ready.",
        provider: parsed.data.provider,
      });
    },
  });

  app.put("/api/sso/toggle", {
    preHandler: [authenticateApiKey],
    handler: async (request, reply) => {
      const { enabled } = request.body as { enabled: boolean };
      const db = getDb();
      const userId = request.userId!;

      // Enforce enterprise tier
      const [user] = await db
        .select({ tier: users.tier })
        .from(users)
        .where(eq(users.id, userId));

      if (!TIER_FEATURES[(user?.tier || "free") as Tier]?.sso) {
        return reply.status(403).send({ error: "SSO requires an Enterprise plan" });
      }

      const teamResults = await db
        .select()
        .from(teams)
        .where(eq(teams.owner_id, userId));

      if (teamResults.length === 0) {
        return reply.status(400).send({ error: "No team found" });
      }

      const [config] = await db
        .select()
        .from(ssoConfigs)
        .where(eq(ssoConfigs.team_id, teamResults[0].id));

      if (!config) {
        return reply.status(404).send({ error: "SSO not configured" });
      }

      await db
        .update(ssoConfigs)
        .set({ enabled, updated_at: new Date() })
        .where(eq(ssoConfigs.id, config.id));

      await logAudit({
        userId,
        teamId: teamResults[0].id,
        action: enabled ? "sso.enabled" : "sso.disabled",
        resourceType: "sso",
        ipAddress: request.ip,
      });

      return reply.send({ enabled });
    },
  });
}

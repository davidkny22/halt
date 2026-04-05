import type { FastifyInstance } from "fastify";
import { eq, and, count } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { rules, users } from "../db/schema.js";
import { authenticateAny as authenticateApiKey } from "../auth/middleware.js";
import { ruleConfigSchema, MAX_FREE_RULES, TIER_FEATURES, type Tier } from "@clawnitor/shared";
import { z } from "zod";
import { logAudit } from "./enterprise.js";

const actionModeSchema = z.enum(["block", "alert", "both"]).default("both");

const createRuleBody = z.object({
  name: z.string().min(1).max(255),
  config: ruleConfigSchema,
  action_mode: actionModeSchema.optional(),
});

const updateRuleBody = z.object({
  name: z.string().min(1).max(255).optional(),
  config: ruleConfigSchema.optional(),
  enabled: z.boolean().optional(),
  action_mode: actionModeSchema.optional(),
});

export async function rulesRoutes(app: FastifyInstance) {
  app.get("/api/rules", {
    preHandler: [authenticateApiKey],
    handler: async (request, reply) => {
      const db = getDb();
      const rows = await db
        .select()
        .from(rules)
        .where(eq(rules.user_id, request.userId!));
      return reply.send({ rules: rows });
    },
  });

  app.post("/api/rules", {
    preHandler: [authenticateApiKey],
    handler: async (request, reply) => {
      const parsed = createRuleBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "Bad Request",
          message: "Invalid rule configuration",
          ...(process.env.NODE_ENV !== "production" && { details: parsed.error.issues }),
        });
      }

      const db = getDb();
      const userId = request.userId!;

      // Check tier and rule count
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId));

      const tier = (user.tier || "free") as Tier;
      const tierFeatures = TIER_FEATURES[tier];

      if (tier === "free") {
        const [{ value: ruleCount }] = await db
          .select({ value: count() })
          .from(rules)
          .where(eq(rules.user_id, userId));

        if (ruleCount >= MAX_FREE_RULES) {
          return reply.status(403).send({
            error: "Upgrade Required",
            message: `Free tier is limited to ${MAX_FREE_RULES} rules. Upgrade to Pro for unlimited rules.`,
          });
        }
      }

      // Enforce NL rule cap per tier
      if (parsed.data.config.type === "nl") {
        if (!tierFeatures.nlRules) {
          return reply.status(403).send({
            error: "Upgrade Required",
            message: "NL rules require a Pro plan or higher.",
          });
        }

        if (tierFeatures.maxNLRules !== Infinity) {
          const [{ value: nlCount }] = await db
            .select({ value: count() })
            .from(rules)
            .where(
              and(
                eq(rules.user_id, userId),
                eq(rules.rule_type, "nl")
              )
            );

          if (nlCount >= tierFeatures.maxNLRules) {
            return reply.status(403).send({
              error: "Limit Reached",
              message: `Your plan allows up to ${tierFeatures.maxNLRules} NL rules. Upgrade for more.`,
            });
          }
        }
      }

      const { name, config, action_mode } = parsed.data;
      const [rule] = await db
        .insert(rules)
        .values({
          user_id: userId,
          name,
          rule_type: config.type,
          config,
          action_mode: action_mode || "both",
        })
        .returning();

      await logAudit({ userId, action: "rule.created", resourceType: "rule", resourceId: rule.id, details: { name, type: config.type }, ipAddress: request.ip });
      return reply.status(201).send(rule);
    },
  });

  app.put("/api/rules/:id", {
    preHandler: [authenticateApiKey],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const parsed = updateRuleBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "Bad Request",
          message: "Invalid update",
          ...(process.env.NODE_ENV !== "production" && { details: parsed.error.issues }),
        });
      }

      const db = getDb();
      const updates: Record<string, unknown> = {
        updated_at: new Date(),
      };
      if (parsed.data.name) updates.name = parsed.data.name;
      if (parsed.data.config) {
        updates.config = parsed.data.config;
        updates.rule_type = parsed.data.config.type;
      }
      if (parsed.data.enabled !== undefined) updates.enabled = parsed.data.enabled;
      if (parsed.data.action_mode) updates.action_mode = parsed.data.action_mode;

      const [updated] = await db
        .update(rules)
        .set(updates)
        .where(and(eq(rules.id, id), eq(rules.user_id, request.userId!)))
        .returning();

      if (!updated) {
        return reply.status(404).send({ error: "Not Found", message: "Rule not found" });
      }

      return reply.send(updated);
    },
  });

  app.delete("/api/rules/:id", {
    preHandler: [authenticateApiKey],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const db = getDb();

      const deleted = await db
        .delete(rules)
        .where(and(eq(rules.id, id), eq(rules.user_id, request.userId!)))
        .returning();

      if (deleted.length === 0) {
        return reply.status(404).send({ error: "Not Found", message: "Rule not found" });
      }

      await logAudit({ userId: request.userId!, action: "rule.deleted", resourceType: "rule", resourceId: id, ipAddress: request.ip });
      return reply.send({ deleted: true });
    },
  });
}

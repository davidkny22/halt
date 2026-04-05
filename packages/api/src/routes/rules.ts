import type { FastifyInstance } from "fastify";
import { eq, and, count, sql } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { rules, users, agents } from "../db/schema.js";
import { authenticateAny as authenticateApiKey } from "../auth/middleware.js";
import { ruleConfigSchema, MAX_FREE_RULES, TIER_FEATURES, type Tier } from "@clawnitor/shared";
import { z } from "zod";
import { logAudit } from "./enterprise.js";

const actionModeSchema = z.enum(["block", "alert", "both"]).default("both");

const createRuleBody = z.object({
  name: z.string().min(1).max(255),
  config: ruleConfigSchema,
  action_mode: actionModeSchema.optional(),
  agent_ids: z.array(z.string().min(1).max(255)).optional(),
  agent_visible: z.boolean().optional(),
});

const updateRuleBody = z.object({
  name: z.string().min(1).max(255).optional(),
  config: ruleConfigSchema.optional(),
  enabled: z.boolean().optional(),
  action_mode: actionModeSchema.optional(),
  agent_ids: z.array(z.string().min(1).max(255)).nullable().optional(),
  agent_visible: z.boolean().optional(),
});

export async function rulesRoutes(app: FastifyInstance) {
  app.get("/api/rules", {
    preHandler: [authenticateApiKey],
    handler: async (request, reply) => {
      const db = getDb();
      const query = request.query as { agent_id?: string };

      const rows = await db
        .select()
        .from(rules)
        .where(eq(rules.user_id, request.userId!));

      // Fetch user's rule visibility setting
      const [user] = await db.select({ rule_visibility: users.rule_visibility }).from(users).where(eq(users.id, request.userId!));
      const ruleVisibility = user?.rule_visibility || "per_rule";

      // Fetch per-agent auto-kill configs
      const agentRows = await db
        .select({
          agent_id: agents.agent_id,
          auto_kill_enabled: agents.auto_kill_enabled,
          auto_kill_threshold: agents.auto_kill_threshold,
          auto_kill_window_minutes: agents.auto_kill_window_minutes,
          status: agents.status,
        })
        .from(agents)
        .where(eq(agents.user_id, request.userId!));

      const autoKillConfigs: Record<string, { enabled: boolean; threshold: number; windowMinutes: number }> = {};
      for (const a of agentRows) {
        if (a.status !== "discovered") {
          autoKillConfigs[a.agent_id] = {
            enabled: a.auto_kill_enabled,
            threshold: a.auto_kill_threshold,
            windowMinutes: a.auto_kill_window_minutes,
          };
        }
      }

      // Fetch team shared rules if user is in a team (map scope → agent_ids)
      let sharedRuleRows: any[] = [];
      try {
        const rawShared = await db.execute(sql`
          SELECT sr.* FROM shared_rules sr
          JOIN team_members tm ON tm.team_id = sr.team_id
          WHERE tm.user_id = ${request.userId!} AND sr.enabled = true
        `);
        sharedRuleRows = (rawShared as any[]).map((r) => ({
          ...r,
          agent_ids: r.scope || null, // Map scope → agent_ids for consistent filtering
        }));
      } catch {}

      const allRules = [...rows, ...sharedRuleRows];

      // If agent_id filter provided, check if agent is discovered (no rules for unactivated agents)
      if (query.agent_id) {
        const agentConfig = agentRows.find((a) => a.agent_id === query.agent_id);
        if (agentConfig?.status === "discovered") {
          return reply.send({ rules: [], rule_visibility: ruleVisibility, auto_kill_configs: autoKillConfigs });
        }

        const filtered = allRules.filter((r: any) =>
          !r.agent_ids || r.agent_ids.length === 0 || r.agent_ids.includes(query.agent_id!)
        );
        return reply.send({ rules: filtered, rule_visibility: ruleVisibility, auto_kill_configs: autoKillConfigs });
      }

      return reply.send({ rules: allRules, rule_visibility: ruleVisibility, auto_kill_configs: autoKillConfigs });
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
        // Use FOR UPDATE to prevent race condition at tier limit
        const [{ value: ruleCount }] = await db
          .select({ value: sql<number>`count(*)::int` })
          .from(rules)
          .where(eq(rules.user_id, userId))
          .for("update");

        if (Number(ruleCount) >= MAX_FREE_RULES) {
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

      const { name, config, action_mode, agent_ids, agent_visible } = parsed.data;
      const [rule] = await db
        .insert(rules)
        .values({
          user_id: userId,
          name,
          rule_type: config.type,
          config,
          action_mode: action_mode || "both",
          agent_ids: agent_ids && agent_ids.length > 0 ? agent_ids : null,
          agent_visible: agent_visible ?? true,
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
      if (parsed.data.agent_ids !== undefined) {
        updates.agent_ids = parsed.data.agent_ids && parsed.data.agent_ids.length > 0
          ? parsed.data.agent_ids
          : null;
      }
      if (parsed.data.agent_visible !== undefined) updates.agent_visible = parsed.data.agent_visible;

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

      // Guard: cannot delete Critical Shield rules
      const [rule] = await db
        .select()
        .from(rules)
        .where(and(eq(rules.id, id), eq(rules.user_id, request.userId!)));

      if (!rule) {
        return reply.status(404).send({ error: "Not Found", message: "Rule not found" });
      }

      const config = rule.config as any;
      if (config?.is_shield && config?.shield_tier === "critical") {
        return reply.status(403).send({
          error: "Forbidden",
          message: "Critical Shield rules cannot be deleted. You can disable them in settings.",
        });
      }

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

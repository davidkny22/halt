import type { FastifyInstance } from "fastify";
import { eq, and, count, desc, sql, inArray } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db/client.js";
import { agents, baselines, users, events } from "../db/schema.js";
import { authenticateAny as authenticateApiKey } from "../auth/middleware.js";
import { TIER_FEATURES, type Tier } from "@clawnitor/shared";

const MAX_AGENTS_FREE = 1;
const MAX_AGENTS_PAID = 50;

const createAgentBody = z.object({
  name: z.string().min(1).max(255),
  agent_id: z.string().min(1).max(255),
});

export async function agentsRoutes(app: FastifyInstance) {
  app.get("/api/agents", {
    preHandler: [authenticateApiKey],
    handler: async (request, reply) => {
      const db = getDb();
      const rows = await db
        .select()
        .from(agents)
        .where(eq(agents.user_id, request.userId!));
      return reply.send({ agents: rows });
    },
  });

  app.post("/api/agents", {
    preHandler: [authenticateApiKey],
    handler: async (request, reply) => {
      const parsed = createAgentBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "Bad Request",
          message: "name and agent_id required (max 255 chars each)",
        });
      }

      const db = getDb();
      const userId = request.userId!;

      // Enforce agent count limit
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      const tier = (user?.tier || "free") as Tier;
      const maxAgents = TIER_FEATURES[tier].killSwitch ? MAX_AGENTS_PAID : MAX_AGENTS_FREE;

      const [{ value: agentCount }] = await db
        .select({ value: count() })
        .from(agents)
        .where(eq(agents.user_id, userId));

      if (agentCount >= maxAgents) {
        return reply.status(403).send({
          error: "Upgrade Required",
          message: `${tier === "free" ? "Free" : "Current"} tier limited to ${maxAgents} agent(s). Upgrade for more.`,
        });
      }

      const { name, agent_id } = parsed.data;
      const [agent] = await db
        .insert(agents)
        .values({ user_id: userId, name, agent_id })
        .returning();

      await db.insert(baselines).values({
        user_id: userId,
        agent_id: agent.id,
        profile: {},
        status: "learning",
      });

      return reply.status(201).send(agent);
    },
  });

  app.delete("/api/agents/:id", {
    preHandler: [authenticateApiKey],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const db = getDb();

      const deleted = await db
        .delete(agents)
        .where(and(eq(agents.id, id), eq(agents.user_id, request.userId!)))
        .returning();

      if (deleted.length === 0) {
        return reply
          .status(404)
          .send({ error: "Not Found", message: "Agent not found" });
      }

      return reply.send({ deleted: true });
    },
  });

  // Auto-kill settings
  const autoKillBody = z.object({
    enabled: z.boolean().optional(),
    threshold: z.number().int().min(2).max(50).optional(),
    windowMinutes: z.number().int().min(1).max(60).optional(),
  });

  app.put("/api/agents/:id/auto-kill", {
    preHandler: [authenticateApiKey],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const parsed = autoKillBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: "Invalid auto-kill config" });
      }

      const db = getDb();
      const updates: Record<string, unknown> = {};
      if (parsed.data.enabled !== undefined)
        updates.auto_kill_enabled = parsed.data.enabled;
      if (parsed.data.threshold !== undefined)
        updates.auto_kill_threshold = parsed.data.threshold;
      if (parsed.data.windowMinutes !== undefined)
        updates.auto_kill_window_minutes = parsed.data.windowMinutes;

      if (Object.keys(updates).length === 0) {
        return reply.status(400).send({ error: "No fields to update" });
      }

      const [updated] = await db
        .update(agents)
        .set(updates)
        .where(and(eq(agents.id, id), eq(agents.user_id, request.userId!)))
        .returning();

      if (!updated) {
        return reply.status(404).send({ error: "Agent not found" });
      }

      return reply.send({
        auto_kill_enabled: updated.auto_kill_enabled,
        auto_kill_threshold: updated.auto_kill_threshold,
        auto_kill_window_minutes: updated.auto_kill_window_minutes,
      });
    },
  });

  // Include auto-kill config in agent config endpoint (used by plugin)
  app.get("/api/agents/:id/config", {
    preHandler: [authenticateApiKey],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const db = getDb();

      const [agent] = await db
        .select()
        .from(agents)
        .where(and(eq(agents.id, id), eq(agents.user_id, request.userId!)));

      if (!agent) {
        return reply.status(404).send({ error: "Agent not found" });
      }

      return reply.send({
        agent_id: agent.agent_id,
        name: agent.name,
        status: agent.status,
        auto_kill: {
          enabled: agent.auto_kill_enabled,
          threshold: agent.auto_kill_threshold,
          windowMinutes: agent.auto_kill_window_minutes,
        },
      });
    },
  });

  // Recent sessions with events (decision traces)
  app.get("/api/agents/:id/sessions", {
    preHandler: [authenticateApiKey],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const db = getDb();

      // Verify agent belongs to user
      const [agent] = await db
        .select()
        .from(agents)
        .where(and(eq(agents.id, id), eq(agents.user_id, request.userId!)));

      if (!agent) {
        return reply.status(404).send({ error: "Agent not found" });
      }

      // Get recent distinct sessions for this agent
      const sessionSummaries = await db
        .select({
          session_id: events.session_id,
          started: sql<string>`min(${events.timestamp})::text`,
          ended: sql<string>`max(${events.timestamp})::text`,
          event_count: sql<number>`count(*)::int`,
          cost: sql<number>`COALESCE(SUM((${events.metadata}->>'cost_usd')::numeric), 0)::float`,
          tokens: sql<number>`COALESCE(SUM((${events.metadata}->>'tokens_used')::int), 0)::int`,
        })
        .from(events)
        .where(
          and(
            eq(events.user_id, request.userId!),
            eq(events.agent_id, id)
          )
        )
        .groupBy(events.session_id)
        .orderBy(desc(sql`max(${events.timestamp})`))
        .limit(10);

      // Get all events for these sessions
      const sessionIds = sessionSummaries.map((s) => s.session_id);
      if (sessionIds.length === 0) {
        return reply.send({ sessions: [] });
      }

      const sessionEvents = await db
        .select({
          id: events.id,
          session_id: events.session_id,
          event_type: events.event_type,
          action: events.action,
          target: events.target,
          metadata: events.metadata,
          severity_hint: events.severity_hint,
          timestamp: events.timestamp,
        })
        .from(events)
        .where(
          and(
            eq(events.user_id, request.userId!),
            eq(events.agent_id, id),
            inArray(events.session_id, sessionIds)
          )
        )
        .orderBy(events.timestamp);

      // Group events by session
      const eventsBySession = new Map<string, typeof sessionEvents>();
      for (const event of sessionEvents) {
        const sid = event.session_id;
        if (!eventsBySession.has(sid)) eventsBySession.set(sid, []);
        eventsBySession.get(sid)!.push(event);
      }

      const sessions = sessionSummaries.map((s) => ({
        ...s,
        events: eventsBySession.get(s.session_id) || [],
      }));

      return reply.send({ sessions });
    },
  });
}

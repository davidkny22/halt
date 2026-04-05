import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { clawnitorEventSchema, TIER_FEATURES, type Tier } from "@clawnitor/shared";
import { getDb } from "../db/client.js";
import { events, agents, baselines, sessions, users } from "../db/schema.js";
import { authenticateAny as authenticateApiKey } from "../auth/middleware.js";
import { RateLimiter } from "../util/rate-limiter.js";
import { IdempotencyChecker } from "../util/idempotency.js";
import { createQueue } from "../jobs/queue.js";
import { eq, and, desc, count, inArray, sql } from "drizzle-orm";

const rateLimiter = new RateLimiter(1000, 1000);
const idempotency = new IdempotencyChecker();

const ingestSchema = z.object({
  events: z.array(clawnitorEventSchema).min(1).max(100),
});

export async function eventsRoutes(app: FastifyInstance) {
  const eventsQueue = createQueue("events");

  app.post("/api/events", {
    preHandler: [authenticateApiKey],
    handler: async (request, reply) => {
      const userId = request.userId!;

      // Validate body first so we know event count for rate limiting
      const parsed = ingestSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "Bad Request",
          message: "Invalid event payload",
          ...(process.env.NODE_ENV !== "production" && { details: parsed.error.issues }),
        });
      }

      // Rate limit by event count, not request count
      const eventCount = parsed.data.events.length;
      if (!rateLimiter.consume(userId, eventCount)) {
        return reply.status(429).send({
          error: "Too Many Requests",
          message: "Rate limit exceeded. Max 1000 events/minute.",
        });
      }

      const db = getDb();
      const incoming = parsed.data.events;

      // Deduplicate
      const unique = incoming.filter((e) => !idempotency.isDuplicate(e.event_id));
      if (unique.length === 0) {
        return reply.send({ accepted: 0, kill_state: { killed: false } });
      }

      // Resolve agent DB IDs — batch lookup, then register unknowns
      const agentIdMap = new Map<string, string>();
      const uniqueAgentIds = [...new Set(unique.map((e) => e.agent_id))];

      // Batch lookup all agents at once (eliminates N+1)
      const existingAgents = uniqueAgentIds.length > 0
        ? await db
            .select()
            .from(agents)
            .where(and(eq(agents.user_id, userId), inArray(agents.agent_id, uniqueAgentIds)))
        : [];

      const discoveredAgentIds = new Set<string>(); // external agent_ids that are still discovered
      for (const agent of existingAgents) {
        agentIdMap.set(agent.agent_id, agent.id);
        if (agent.status === "discovered") {
          discoveredAgentIds.add(agent.agent_id);
        }
      }

      // Register unknown agents (single count query)
      const unknownIds = uniqueAgentIds.filter((id) => !agentIdMap.has(id));
      if (unknownIds.length > 0) {
        const [{ value: agentCount }] = await db
          .select({ value: count() })
          .from(agents)
          .where(eq(agents.user_id, userId));

        let createdCount = 0;
        for (const agentExtId of unknownIds) {
          if (Number(agentCount) + createdCount >= 50) break;

          const [newAgent] = await db
            .insert(agents)
            .values({
              user_id: userId,
              name: agentExtId,
              agent_id: agentExtId,
            })
            .returning();

          await db.insert(baselines).values({
            user_id: userId,
            agent_id: newAgent.id,
            profile: {},
            status: "learning",
          });

          agentIdMap.set(agentExtId, newAgent.id);
          createdCount++;
        }
      }

      // Keep only events from monitored agents (not discovered, not unknown)
      const acceptedEvents = unique.filter((e) =>
        agentIdMap.has(e.agent_id) && !discoveredAgentIds.has(e.agent_id)
      );
      if (acceptedEvents.length === 0) {
        return reply.send({ accepted: 0, kill_state: { killed: false } });
      }

      const rows = acceptedEvents.map((e) => ({
        id: e.event_id,
        user_id: userId,
        agent_id: agentIdMap.get(e.agent_id)!,
        session_id: e.session_id,
        event_type: e.event_type as any,
        action: e.action,
        target: e.target,
        metadata: e.metadata,
        severity_hint: e.severity_hint as any,
        plugin_version: e.plugin_version,
        timestamp: new Date(e.timestamp),
      }));

      let insertedIds: Set<string>;
      try {
        const inserted = await db.insert(events).values(rows).onConflictDoNothing({
          target: events.id,
        }).returning({ id: events.id });
        insertedIds = new Set(inserted.map((r) => r.id));
      } catch (err) {
        request.log.error("Failed to insert events: %s", (err as Error).message);
        return reply.status(500).send({ error: "Failed to store events" });
      }

      // Only process actually-inserted events for sessions and rule evaluation
      const insertedEvents = acceptedEvents.filter((e) => insertedIds.has(e.event_id));
      if (insertedEvents.length === 0) {
        return reply.send({ accepted: 0, kill_state: { killed: false } });
      }

      // Upsert sessions — create on first event, update stats on subsequent
      // Prefix session IDs with user ID to prevent cross-user collisions on global PK
      const sessionMap = new Map<string, { agentDbId: string; events: typeof acceptedEvents }>();
      for (const event of insertedEvents) {
        const sid = `${userId}:${event.session_id}`;
        const agentDbId = agentIdMap.get(event.agent_id);
        if (!agentDbId) continue;
        if (!sessionMap.has(sid)) sessionMap.set(sid, { agentDbId, events: [] });
        sessionMap.get(sid)!.events.push(event);
      }

      for (const [sid, { agentDbId, events: sessionEvents }] of sessionMap) {
        const cost = sessionEvents.reduce((s, e) => s + (e.metadata?.cost_usd || 0), 0);
        const tokens = sessionEvents.reduce((s, e) => s + (e.metadata?.tokens_used || 0), 0);
        const isEnd = sessionEvents.some((e) => e.action === "session ended" || e.action === "agent ended");
        const duration = sessionEvents.find((e) => e.metadata?.duration_ms)?.metadata?.duration_ms;

        try {
          await db
            .insert(sessions)
            .values({
              id: sid,
              user_id: userId,
              agent_id: agentDbId,
              status: isEnd ? "completed" : "active",
              started_at: new Date(sessionEvents[0].timestamp),
              ended_at: isEnd ? new Date(sessionEvents[sessionEvents.length - 1].timestamp) : undefined,
              duration_ms: duration ? Math.round(duration) : undefined,
              event_count: sessionEvents.length,
              total_cost: String(cost),
              total_tokens: tokens,
              metadata: { plugin_version: sessionEvents[0].plugin_version },
            })
            .onConflictDoUpdate({
              target: sessions.id,
              set: {
                event_count: sql`${sessions.event_count} + ${sessionEvents.length}`,
                total_cost: sql`${sessions.total_cost} + ${cost}`,
                total_tokens: sql`${sessions.total_tokens} + ${tokens}`,
                updated_at: new Date(),
                ...(isEnd ? {
                  status: "completed" as const,
                  ended_at: new Date(sessionEvents[sessionEvents.length - 1].timestamp),
                  ...(duration ? { duration_ms: Math.round(duration) } : {}),
                } : {}),
              },
            });
        } catch (err) {
          request.log.error("Failed to upsert session %s: %s", sid, (err as Error).message);
        }
      }

      // Enqueue for processing (rule evaluation in Phase 2)
      await eventsQueue.add("process", { events: insertedEvents, userId });

      // Check per-agent kill state
      const agentDbIds = [...new Set([...agentIdMap.values()])];
      const agentKillStates: Record<string, { killed: boolean; reason?: string }> = {};
      let anyKilled = false;
      let anyKillReason: string | undefined;

      for (const dbId of agentDbIds) {
        const [agent] = await db
          .select()
          .from(agents)
          .where(eq(agents.id, dbId))
          .limit(1);
        if (agent) {
          const isPaused = agent.status === "paused";
          agentKillStates[agent.agent_id] = {
            killed: isPaused,
            ...(isPaused && agent.kill_reason ? { reason: agent.kill_reason } : {}),
          };
          if (isPaused) {
            anyKilled = true;
            anyKillReason = agent.kill_reason ?? undefined;
          }
        }
      }

      return reply.send({
        accepted: insertedEvents.length,
        // Backwards-compatible: global kill_state for older plugins
        kill_state: { killed: anyKilled, reason: anyKillReason },
        // Per-agent kill states for plugin 2.2+
        agent_kill_states: agentKillStates,
      });
    },
  });

  // Reconcile orphaned events into sessions (backfill)
  app.post("/api/events/reconcile", {
    preHandler: [authenticateApiKey],
    handler: async (request, reply) => {
      const db = getDb();
      const userId = request.userId!;

      // Find session_ids in events that have no sessions row (prefixed with userId for global PK)
      const orphans = await db.execute(sql`
        SELECT
          ${userId} || ':' || e.session_id as prefixed_session_id,
          e.agent_id,
          min(e.timestamp) as started_at,
          max(e.timestamp) as ended_at,
          count(*)::int as event_count,
          COALESCE(SUM((e.metadata->>'cost_usd')::numeric), 0) as total_cost,
          COALESCE(SUM((e.metadata->>'tokens_used')::int), 0)::int as total_tokens
        FROM events e
        LEFT JOIN sessions s ON s.id = ${userId} || ':' || e.session_id
        WHERE e.user_id = ${userId} AND s.id IS NULL
        GROUP BY e.session_id, e.agent_id
      `);

      if (orphans.length === 0) {
        return reply.send({ reconciled: 0 });
      }

      let reconciled = 0;
      for (const row of orphans) {
        try {
          await db.insert(sessions).values({
            id: row.prefixed_session_id as string,
            user_id: userId,
            agent_id: row.agent_id as string,
            status: "completed",
            started_at: new Date(row.started_at as string),
            ended_at: new Date(row.ended_at as string),
            event_count: Number(row.event_count),
            total_cost: String(row.total_cost),
            total_tokens: Number(row.total_tokens),
            metadata: {},
          }).onConflictDoNothing({ target: sessions.id });
          reconciled++;
        } catch (err) {
          request.log.error("Failed to reconcile session %s: %s", row.prefixed_session_id, (err as Error).message);
        }
      }

      return reply.send({ reconciled, total_orphans: orphans.length });
    },
  });

  app.get("/api/events", {
    preHandler: [authenticateApiKey],
    handler: async (request, reply) => {
      const userId = request.userId!;
      const query = request.query as {
        agent_id?: string;
        limit?: string;
        offset?: string;
      };

      const db = getDb();
      const limit = Math.min(Math.max(parseInt(query.limit || "50", 10) || 50, 1), 100);
      const offset = Math.max(parseInt(query.offset || "0", 10) || 0, 0);

      const conditions = [eq(events.user_id, userId)];
      if (query.agent_id) {
        conditions.push(eq(events.agent_id, query.agent_id));
      }

      const rows = await db
        .select({
          id: events.id,
          user_id: events.user_id,
          agent_id: events.agent_id,
          agent_name: agents.name,
          session_id: events.session_id,
          event_type: events.event_type,
          action: events.action,
          target: events.target,
          metadata: events.metadata,
          severity_hint: events.severity_hint,
          plugin_version: events.plugin_version,
          timestamp: events.timestamp,
          created_at: events.created_at,
        })
        .from(events)
        .leftJoin(agents, eq(events.agent_id, agents.id))
        .where(and(...conditions))
        .orderBy(desc(events.timestamp))
        .limit(limit)
        .offset(offset);

      return reply.send({ events: rows, limit, offset });
    },
  });
}

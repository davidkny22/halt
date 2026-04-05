import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { clawnitorEventSchema } from "@clawnitor/shared";
import { getDb } from "../db/client.js";
import { events, agents, baselines, sessions } from "../db/schema.js";
import { authenticateAny as authenticateApiKey } from "../auth/middleware.js";
import { RateLimiter } from "../util/rate-limiter.js";
import { IdempotencyChecker } from "../util/idempotency.js";
import { createQueue } from "../jobs/queue.js";
import { eq, and, desc, count } from "drizzle-orm";

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

      // Rate limit
      if (!rateLimiter.consume(userId, 1)) {
        return reply.status(429).send({
          error: "Too Many Requests",
          message: "Rate limit exceeded. Max 1000 events/minute.",
        });
      }

      // Validate body
      const parsed = ingestSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "Bad Request",
          message: "Invalid event payload",
          ...(process.env.NODE_ENV !== "production" && { details: parsed.error.issues }),
        });
      }

      const db = getDb();
      const incoming = parsed.data.events;

      // Deduplicate
      const unique = incoming.filter((e) => !idempotency.isDuplicate(e.event_id));
      if (unique.length === 0) {
        return reply.send({ accepted: 0, kill_state: { killed: false } });
      }

      // Resolve agent DB IDs — find or auto-register agents
      const agentIdMap = new Map<string, string>();
      for (const event of unique) {
        if (!agentIdMap.has(event.agent_id)) {
          const existing = await db
            .select()
            .from(agents)
            .where(
              and(eq(agents.user_id, userId), eq(agents.agent_id, event.agent_id))
            )
            .limit(1);

          if (existing.length > 0) {
            agentIdMap.set(event.agent_id, existing[0].id);
          } else {
            // Auto-register unknown agents (with limit)
            const [{ value: agentCount }] = await db
              .select({ value: count() })
              .from(agents)
              .where(eq(agents.user_id, userId));

            if (agentCount >= 50) {
              // Skip events from unregistered agents beyond limit
              continue;
            }

            const [newAgent] = await db
              .insert(agents)
              .values({
                user_id: userId,
                name: event.agent_id,
                agent_id: event.agent_id,
              })
              .returning();

            await db.insert(baselines).values({
              user_id: userId,
              agent_id: newAgent.id,
              profile: {},
              status: "learning",
            });

            agentIdMap.set(event.agent_id, newAgent.id);
          }
        }
      }

      // Keep only events tied to known/registered agents
      const acceptedEvents = unique.filter((e) => agentIdMap.has(e.agent_id));
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

      await db.insert(events).values(rows).onConflictDoNothing({
        target: events.id,
      });

      // Upsert sessions — create on first event, update stats on subsequent
      const sessionMap = new Map<string, { agentDbId: string; events: typeof acceptedEvents }>();
      for (const event of acceptedEvents) {
        const sid = event.session_id;
        const agentDbId = agentIdMap.get(event.agent_id);
        if (!agentDbId) continue;
        if (!sessionMap.has(sid)) sessionMap.set(sid, { agentDbId, events: [] });
        sessionMap.get(sid)!.events.push(event);
      }

      for (const [sid, { agentDbId, events: sessionEvents }] of sessionMap) {
        const cost = sessionEvents.reduce((s, e) => s + (e.metadata?.cost_usd || 0), 0);
        const tokens = sessionEvents.reduce((s, e) => s + (e.metadata?.tokens_used || 0), 0);
        const isStart = sessionEvents.some((e) => e.action === "session started");
        const isEnd = sessionEvents.some((e) => e.action === "session ended" || e.action === "agent ended");
        const duration = sessionEvents.find((e) => e.metadata?.duration_ms)?.metadata?.duration_ms;

        const existing = await db.select().from(sessions).where(eq(sessions.id, sid)).limit(1);
        if (existing.length === 0) {
          await db.insert(sessions).values({
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
          }).onConflictDoNothing();
        } else {
          const updates: Record<string, unknown> = {
            event_count: (existing[0].event_count || 0) + sessionEvents.length,
            total_cost: String(Number(existing[0].total_cost || 0) + cost),
            total_tokens: (existing[0].total_tokens || 0) + tokens,
            updated_at: new Date(),
          };
          if (isEnd) {
            updates.status = "completed";
            updates.ended_at = new Date(sessionEvents[sessionEvents.length - 1].timestamp);
            if (duration) updates.duration_ms = Math.round(duration);
          }
          await db.update(sessions).set(updates).where(eq(sessions.id, sid));
        }
      }

      // Enqueue for processing (rule evaluation in Phase 2)
      await eventsQueue.add("process", { events: acceptedEvents, userId });

      // Check kill state — if any agent is paused, report it
      const agentDbIds = [...new Set([...agentIdMap.values()])];
      let killed = false;
      let killReason: string | undefined;

      for (const dbId of agentDbIds) {
        const [agent] = await db
          .select()
          .from(agents)
          .where(eq(agents.id, dbId))
          .limit(1);
        if (agent?.status === "paused") {
          killed = true;
          killReason = agent.kill_reason ?? undefined;
          break;
        }
      }

      return reply.send({
        accepted: acceptedEvents.length,
        kill_state: { killed, reason: killReason },
      });
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

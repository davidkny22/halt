import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { clawnitorEventSchema } from "@clawnitor/shared";
import { getDb } from "../db/client.js";
import { events, agents } from "../db/schema.js";
import { authenticateApiKey } from "../auth/middleware.js";
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
            agentIdMap.set(event.agent_id, newAgent.id);
          }
        }
      }

      // Insert events
      const rows = unique.map((e) => ({
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

      await db.insert(events).values(rows);

      // Enqueue for processing (rule evaluation in Phase 2)
      await eventsQueue.add("process", { events: unique, userId });

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
        accepted: unique.length,
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
      const limit = Math.min(parseInt(query.limit || "50"), 100);
      const offset = parseInt(query.offset || "0");

      let q = db
        .select()
        .from(events)
        .where(eq(events.user_id, userId))
        .orderBy(desc(events.timestamp))
        .limit(limit)
        .offset(offset);

      const rows = await q;
      return reply.send({ events: rows, limit, offset });
    },
  });
}

import type { FastifyInstance } from "fastify";
import { eq, desc, and, sql } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { sessions, agents } from "../db/schema.js";
import { authenticateAny as authenticateApiKey } from "../auth/middleware.js";

export async function sessionsRoutes(app: FastifyInstance) {
  // List all sessions for the user
  app.get("/api/sessions", {
    preHandler: [authenticateApiKey],
    handler: async (request, reply) => {
      const db = getDb();
      const userId = request.userId!;
      const query = request.query as { limit?: string; agent_id?: string; status?: string };
      const limit = Math.min(parseInt(query.limit || "20", 10) || 20, 100);

      const conditions = [eq(sessions.user_id, userId)];
      if (query.agent_id) conditions.push(eq(sessions.agent_id, query.agent_id));
      if (query.status) conditions.push(eq(sessions.status, query.status));

      const rows = await db
        .select({
          id: sessions.id,
          agent_id: sessions.agent_id,
          agent_name: agents.name,
          status: sessions.status,
          started_at: sessions.started_at,
          ended_at: sessions.ended_at,
          duration_ms: sessions.duration_ms,
          event_count: sessions.event_count,
          total_cost: sessions.total_cost,
          total_tokens: sessions.total_tokens,
          kill_reason: sessions.kill_reason,
          metadata: sessions.metadata,
        })
        .from(sessions)
        .leftJoin(agents, eq(sessions.agent_id, agents.id))
        .where(and(...conditions))
        .orderBy(desc(sessions.started_at))
        .limit(limit);

      return reply.send({ sessions: rows });
    },
  });

  // Get a single session by ID
  app.get("/api/sessions/:id", {
    preHandler: [authenticateApiKey],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const db = getDb();

      const [session] = await db
        .select({
          id: sessions.id,
          agent_id: sessions.agent_id,
          agent_name: agents.name,
          status: sessions.status,
          started_at: sessions.started_at,
          ended_at: sessions.ended_at,
          duration_ms: sessions.duration_ms,
          event_count: sessions.event_count,
          total_cost: sessions.total_cost,
          total_tokens: sessions.total_tokens,
          kill_reason: sessions.kill_reason,
          metadata: sessions.metadata,
        })
        .from(sessions)
        .leftJoin(agents, eq(sessions.agent_id, agents.id))
        .where(and(eq(sessions.id, id), eq(sessions.user_id, request.userId!)));

      if (!session) {
        return reply.status(404).send({ error: "Session not found" });
      }

      return reply.send(session);
    },
  });

  // Session aggregate stats
  app.get("/api/sessions/stats", {
    preHandler: [authenticateApiKey],
    handler: async (request, reply) => {
      const db = getDb();
      const userId = request.userId!;

      // Average session duration
      const [durationStats] = await db
        .select({
          avg_duration: sql<number>`COALESCE(AVG(${sessions.duration_ms}), 0)::float`,
          p50_duration: sql<number>`COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ${sessions.duration_ms}), 0)::float`,
          p95_duration: sql<number>`COALESCE(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY ${sessions.duration_ms}), 0)::float`,
          total_sessions: sql<number>`count(*)::int`,
          active_sessions: sql<number>`count(*) FILTER (WHERE ${sessions.status} = 'active')::int`,
          killed_sessions: sql<number>`count(*) FILTER (WHERE ${sessions.status} = 'killed')::int`,
        })
        .from(sessions)
        .where(eq(sessions.user_id, userId));

      // Plugin version distribution
      const pluginVersions = await db
        .select({
          version: sql<string>`${sessions.metadata}->>'plugin_version'`,
          count: sql<number>`count(*)::int`,
        })
        .from(sessions)
        .where(
          and(
            eq(sessions.user_id, userId),
            sql`${sessions.metadata}->>'plugin_version' IS NOT NULL`
          )
        )
        .groupBy(sql`${sessions.metadata}->>'plugin_version'`)
        .orderBy(desc(sql`count(*)`))
        .limit(10);

      return reply.send({
        duration: {
          avg_ms: durationStats?.avg_duration || 0,
          p50_ms: durationStats?.p50_duration || 0,
          p95_ms: durationStats?.p95_duration || 0,
        },
        counts: {
          total: durationStats?.total_sessions || 0,
          active: durationStats?.active_sessions || 0,
          killed: durationStats?.killed_sessions || 0,
        },
        plugin_versions: pluginVersions,
      });
    },
  });
}

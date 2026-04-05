import type { FastifyInstance } from "fastify";
import { sql, count } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { events, agents, saves } from "../db/schema.js";

// Cache for 5 minutes to avoid hammering the DB
let cache: { data: any; expiresAt: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

export async function publicStatsRoutes(app: FastifyInstance) {
  app.get("/api/public-stats", {
    handler: async (_request, reply) => {
      if (cache && Date.now() < cache.expiresAt) {
        return reply.send(cache.data);
      }

      const db = getDb();

      const [eventsResult] = await db
        .select({ value: count() })
        .from(events);

      const [agentsResult] = await db
        .select({ value: sql<number>`count(DISTINCT ${agents.agent_id})::int` })
        .from(agents);

      const [savesResult] = await db
        .select({ value: count() })
        .from(saves);

      const data = {
        events_processed: Number(eventsResult?.value ?? 0),
        agents_protected: Number(agentsResult?.value ?? 0),
        actions_blocked: Number(savesResult?.value ?? 0),
      };

      cache = { data, expiresAt: Date.now() + CACHE_TTL };
      return reply.send(data);
    },
  });
}

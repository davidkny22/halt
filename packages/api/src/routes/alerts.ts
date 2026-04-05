import type { FastifyInstance } from "fastify";
import { eq, desc } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { alerts } from "../db/schema.js";
import { authenticateAny as authenticateApiKey } from "../auth/middleware.js";

export async function alertsRoutes(app: FastifyInstance) {
  app.get("/api/alerts", {
    preHandler: [authenticateApiKey],
    handler: async (request, reply) => {
      const query = request.query as { limit?: string; offset?: string };
      const limit = Math.min(Math.max(parseInt(query.limit || "50", 10) || 50, 1), 100);
      const offset = Math.max(parseInt(query.offset || "0", 10) || 0, 0);

      const db = getDb();
      const rows = await db
        .select()
        .from(alerts)
        .where(eq(alerts.user_id, request.userId!))
        .orderBy(desc(alerts.created_at))
        .limit(limit)
        .offset(offset);

      return reply.send({ alerts: rows, limit, offset });
    },
  });
}

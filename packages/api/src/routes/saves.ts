import type { FastifyInstance } from "fastify";
import { eq, desc, sql } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { saves } from "../db/schema.js";
import { authenticateAny } from "../auth/middleware.js";

export async function savesRoutes(app: FastifyInstance) {
  // Get saves list (most recent first)
  app.get("/api/saves", {
    preHandler: [authenticateAny],
    handler: async (request, reply) => {
      const { limit = "20" } = request.query as { limit?: string };
      const db = getDb();

      const rows = await db
        .select()
        .from(saves)
        .where(eq(saves.user_id, request.userId!))
        .orderBy(desc(saves.created_at))
        .limit(Math.min(parseInt(limit, 10) || 20, 100));

      return reply.send({ saves: rows });
    },
  });

  // Get total save count
  app.get("/api/saves/count", {
    preHandler: [authenticateAny],
    handler: async (request, reply) => {
      const db = getDb();

      const [result] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(saves)
        .where(eq(saves.user_id, request.userId!));

      return reply.send({ count: result?.count ?? 0 });
    },
  });
}

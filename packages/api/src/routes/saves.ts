import type { FastifyInstance } from "fastify";
import { eq, desc, sql, and } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { saves, agents, rules } from "../db/schema.js";
import { authenticateAny } from "../auth/middleware.js";

export async function savesRoutes(app: FastifyInstance) {
  // Get saves list (most recent first)
  app.get("/api/saves", {
    preHandler: [authenticateAny],
    handler: async (request, reply) => {
      const { limit = "20" } = request.query as { limit?: string };
      const db = getDb();

      const rows = await db
        .select({
          id: saves.id,
          user_id: saves.user_id,
          agent_id: saves.agent_id,
          agent_name: agents.name,
          rule_id: saves.rule_id,
          rule_name: rules.name,
          action_blocked: saves.action_blocked,
          potential_impact: saves.potential_impact,
          source: saves.source,
          created_at: saves.created_at,
        })
        .from(saves)
        .leftJoin(agents, eq(saves.agent_id, agents.id))
        .leftJoin(rules, eq(saves.rule_id, rules.id))
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

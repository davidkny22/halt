import type { FastifyInstance } from "fastify";
import { getDb } from "../db/client.js";
import { ruleTemplates } from "../db/schema.js";

export async function ruleTemplatesRoutes(app: FastifyInstance) {
  // Get all rule templates (no auth — public, cacheable)
  app.get("/api/rule-templates", {
    handler: async (_request, reply) => {
      const db = getDb();

      const templates = await db
        .select()
        .from(ruleTemplates)
        .orderBy(ruleTemplates.category, ruleTemplates.severity);

      // Group by category
      const grouped: Record<string, typeof templates> = {};
      for (const t of templates) {
        if (!grouped[t.category]) grouped[t.category] = [];
        grouped[t.category].push(t);
      }

      reply.header("Cache-Control", "public, max-age=3600");
      return reply.send({ templates, by_category: grouped });
    },
  });
}

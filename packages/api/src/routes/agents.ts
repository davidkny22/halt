import type { FastifyInstance } from "fastify";
import { eq, and, count } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db/client.js";
import { agents, users } from "../db/schema.js";
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
}

import type { FastifyInstance } from "fastify";
import { eq, and } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { agents } from "../db/schema.js";
import { authenticateApiKey } from "../auth/middleware.js";
import { sendKill, sendUnkill } from "../ws/kill-server.js";

export async function killRoutes(app: FastifyInstance) {
  app.post("/api/agents/:agentId/kill", {
    preHandler: [authenticateApiKey],
    handler: async (request, reply) => {
      const { agentId } = request.params as { agentId: string };
      const { reason } = (request.body as { reason?: string }) || {};
      const db = getDb();

      const [agent] = await db
        .update(agents)
        .set({ status: "paused", kill_reason: reason || "Killed via API" })
        .where(
          and(eq(agents.id, agentId), eq(agents.user_id, request.userId!))
        )
        .returning();

      if (!agent) {
        return reply.status(404).send({ error: "Not Found", message: "Agent not found" });
      }

      // Send kill via WebSocket
      sendKill(request.userId!, reason || "Killed via API");

      return reply.send({
        killed: true,
        agent_id: agent.id,
        reason: agent.kill_reason,
      });
    },
  });

  app.post("/api/agents/:agentId/resume", {
    preHandler: [authenticateApiKey],
    handler: async (request, reply) => {
      const { agentId } = request.params as { agentId: string };
      const db = getDb();

      const [agent] = await db
        .update(agents)
        .set({ status: "active", kill_reason: null })
        .where(
          and(eq(agents.id, agentId), eq(agents.user_id, request.userId!))
        )
        .returning();

      if (!agent) {
        return reply.status(404).send({ error: "Not Found", message: "Agent not found" });
      }

      // Send unkill via WebSocket
      sendUnkill(request.userId!);

      return reply.send({
        resumed: true,
        agent_id: agent.id,
      });
    },
  });
}

import type { FastifyInstance } from "fastify";
import { eq, and, gte, sql, count } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { agents, saves, users } from "../db/schema.js";
import { authenticateAny as authenticateApiKey } from "../auth/middleware.js";
import { sendKill, sendUnkill } from "../ws/kill-server.js";
import { logAudit } from "./enterprise.js";
import { RateLimiter } from "../util/rate-limiter.js";
import { TIER_FEATURES, type Tier } from "@clawnitor/shared";

const killRateLimiter = new RateLimiter(10, 10); // 10 req/min

export async function killRoutes(app: FastifyInstance) {
  app.post("/api/agents/:agentId/kill", {
    preHandler: [authenticateApiKey],
    handler: async (request, reply) => {
      if (!killRateLimiter.consume(request.userId || request.ip)) {
        return reply.status(429).send({ error: "Too many requests" });
      }
      const { agentId } = request.params as { agentId: string };
      const { reason } = (request.body as { reason?: string }) || {};
      const db = getDb();

      // Check monthly kill limit for free tier
      const [user] = await db.select().from(users).where(eq(users.id, request.userId!));
      const tier = (user?.tier || "free") as Tier;
      const features = TIER_FEATURES[tier];

      if (features.monthlyKills !== Infinity) {
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);

        const [{ value: killsThisMonth }] = await db
          .select({ value: count() })
          .from(saves)
          .where(
            and(
              eq(saves.user_id, request.userId!),
              eq(saves.source, "manual-kill"),
              gte(saves.created_at, monthStart)
            )
          );

        if (Number(killsThisMonth) >= features.monthlyKills) {
          return reply.status(403).send({
            error: "Kill limit reached",
            message: `Free tier includes ${features.monthlyKills} kill per month. Upgrade to Pro for unlimited kills.`,
            upgrade_url: "https://app.clawnitor.io/settings",
          });
        }
      }

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

      // Record the save
      await db.insert(saves).values({
        user_id: request.userId!,
        agent_id: agentId,
        action_blocked: reason || "Manual kill via dashboard",
        potential_impact: "Agent stopped before further actions could execute",
        source: "manual-kill",
      });

      await logAudit({ userId: request.userId!, action: "agent.killed", resourceType: "agent", resourceId: agentId, details: { reason }, ipAddress: request.ip });

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
      if (!killRateLimiter.consume(request.userId || request.ip)) {
        return reply.status(429).send({ error: "Too many requests" });
      }
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

      await logAudit({ userId: request.userId!, action: "agent.resumed", resourceType: "agent", resourceId: agentId, ipAddress: request.ip });

      return reply.send({
        resumed: true,
        agent_id: agent.id,
      });
    },
  });
}

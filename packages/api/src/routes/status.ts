import type { FastifyInstance } from "fastify";
import { isDegraded, getProviderStatus } from "../ai/client.js";

export async function statusRoutes(app: FastifyInstance) {
  app.get("/api/status", async (request, reply) => {
    return reply.send({
      status: "ok",
      ai: getProviderStatus(),
      timestamp: new Date().toISOString(),
    });
  });
}

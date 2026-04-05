import type { FastifyInstance } from "fastify";
import { isDegraded } from "../ai/haiku-client.js";

export async function statusRoutes(app: FastifyInstance) {
  app.get("/api/status", async (request, reply) => {
    return reply.send({
      status: "ok",
      haiku: {
        available: !isDegraded(),
        degraded: isDegraded(),
      },
      timestamp: new Date().toISOString(),
    });
  });
}

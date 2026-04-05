import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import rawBody from "fastify-raw-body";
import { getConfig } from "./config.js";
import { eventsRoutes } from "./routes/events.js";
import { agentsRoutes } from "./routes/agents.js";
import { rulesRoutes } from "./routes/rules.js";
import { alertsRoutes } from "./routes/alerts.js";
import { killServerRoutes } from "./ws/kill-server.js";
import { killRoutes } from "./routes/kill.js";
import { statusRoutes } from "./routes/status.js";
import { billingRoutes } from "./routes/billing.js";
import { startEventProcessor } from "./jobs/event-processor.js";
import { startAlertDelivery } from "./jobs/alert-delivery.js";

export async function buildApp() {
  const app = Fastify({
    logger: process.env.NODE_ENV === "production"
      ? { level: "info" }
      : {
          level: "info",
          transport: {
            target: "pino-pretty",
            options: { colorize: true },
          },
        },
    bodyLimit: 10 * 1024 * 1024, // 10MB
  });

  await app.register(cors, {
    origin: [
      "https://clawnitor.io",
      "https://www.clawnitor.io",
      ...(process.env.NODE_ENV !== "production" ? ["http://localhost:3000"] : []),
    ],
    credentials: true,
  });
  await app.register(websocket);
  await app.register(rawBody, { field: "rawBody", global: false });

  // Routes
  await app.register(eventsRoutes);
  await app.register(agentsRoutes);
  await app.register(rulesRoutes);
  await app.register(alertsRoutes);
  await app.register(killServerRoutes);
  await app.register(killRoutes);
  await app.register(statusRoutes);
  await app.register(billingRoutes);

  // Health check
  app.get("/health", async () => ({ status: "ok" }));

  return app;
}

async function main() {
  const config = getConfig();
  const app = await buildApp();

  // Start workers
  startEventProcessor();
  startAlertDelivery();

  await app.listen({ port: config.PORT, host: "0.0.0.0" });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});

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
import { authRoutes } from "./routes/auth.js";
import { teamsRoutes } from "./routes/teams.js";
import { statsRoutes } from "./routes/stats.js";
import { accountRoutes } from "./routes/account.js";
import { enterpriseRoutes } from "./routes/enterprise.js";
import { savesRoutes } from "./routes/saves.js";
import { feedbackRoutes } from "./routes/feedback.js";
import { publicStatsRoutes } from "./routes/public-stats.js";
import { betaRoutes } from "./routes/beta.js";
import { analyticsRoutes } from "./routes/analytics.js";
import { ruleTemplatesRoutes } from "./routes/rule-templates.js";
import { spendRoutes } from "./routes/spend.js";
import { sessionsRoutes } from "./routes/sessions.js";
import { seedRuleTemplates } from "./db/seed-templates.js";
import { startEventProcessor } from "./jobs/event-processor.js";
import { startAlertDelivery } from "./jobs/alert-delivery.js";
import { startUsageSyncWorker } from "./jobs/usage-sync.js";
import { startBaselineUpdateWorker } from "./jobs/baseline-update.js";
import { startAnomalyCheckWorker } from "./jobs/anomaly-check.js";
import { startNLBatchWorker } from "./jobs/nl-batch.js";
import { createQueue } from "./jobs/queue.js";
import {
  ANOMALY_CHECK_INTERVAL_MINUTES,
  NL_EVAL_INTERVAL_MINUTES,
} from "@halt/shared";

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
      "https://halt.dev",
      "https://www.halt.dev",
      "https://app.halt.dev",
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
  await app.register(authRoutes);
  await app.register(teamsRoutes);
  await app.register(statsRoutes);
  await app.register(accountRoutes);
  await app.register(enterpriseRoutes);
  await app.register(savesRoutes);
  await app.register(feedbackRoutes);
  await app.register(publicStatsRoutes);
  await app.register(betaRoutes);
  await app.register(analyticsRoutes);
  await app.register(ruleTemplatesRoutes);
  await app.register(spendRoutes);
  await app.register(sessionsRoutes);

  // Seed rule templates on first startup
  seedRuleTemplates().catch((err) =>
    app.log.error("Failed to seed rule templates: %s", err.message)
  );

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
  startUsageSyncWorker();
  startBaselineUpdateWorker();
  startAnomalyCheckWorker();
  startNLBatchWorker();

  // Schedule usage sync every hour
  const usageSyncQueue = createQueue("usage-sync");
  await usageSyncQueue.upsertJobScheduler("usage-sync-hourly", {
    every: 60 * 60 * 1000, // 1 hour
  }, { name: "sync" });

  // Refresh baseline profiles every hour
  const baselineQueue = createQueue("baseline-update");
  await baselineQueue.upsertJobScheduler(
    "baseline-update-hourly",
    { every: 60 * 60 * 1000 },
    { name: "run" }
  );

  // Run anomaly checks on the configured cadence
  const anomalyQueue = createQueue("anomaly-check");
  await anomalyQueue.upsertJobScheduler(
    "anomaly-check-recurring",
    { every: ANOMALY_CHECK_INTERVAL_MINUTES * 60 * 1000 },
    { name: "run" }
  );

  // Run NL rule evaluation on the configured cadence
  const nlEvalQueue = createQueue("nl-eval");
  await nlEvalQueue.upsertJobScheduler(
    "nl-eval-recurring",
    { every: NL_EVAL_INTERVAL_MINUTES * 60 * 1000 },
    { name: "run" }
  );

  await app.listen({ port: config.PORT, host: "0.0.0.0" });
}

main().catch((err) => {
  // Logger not yet available at this point — stderr is fine
  process.stderr.write(`Failed to start server: ${err}\n`);
  process.exit(1);
});

import { createWorker } from "./queue.js";
import type { Job } from "bullmq";
import { getDb } from "../db/client.js";
import { baselines, events, alerts, agents, users } from "../db/schema.js";
import { eq, and, gte, desc } from "drizzle-orm";
import { scoreAnomaly } from "../ai/anomaly-scorer.js";
import { isDegraded } from "../ai/client.js";
import { sendKill } from "../ws/kill-server.js";
import { ANOMALY_CHECK_INTERVAL_MINUTES, TIER_FEATURES } from "@halt/shared";
import type { BaselineProfile } from "../ai/baseline-builder.js";
import { createQueue } from "./queue.js";
import { logger } from "../util/logger.js";

export function startAnomalyCheckWorker() {
  const alertQueue = createQueue("alerts");

  return createWorker("anomaly-check", async (job: Job) => {
    if (isDegraded()) {
      logger.warn("Skipping anomaly check — AI provider degraded");
      return { skipped: true };
    }

    const db = getDb();
    const windowStart = new Date(
      Date.now() - ANOMALY_CHECK_INTERVAL_MINUTES * 60 * 1000
    );

    // Find all active baselines
    const activeBaselines = await db
      .select()
      .from(baselines)
      .where(eq(baselines.status, "active"));

    let checked = 0;

    for (const baseline of activeBaselines) {
      // Get recent events for this agent
      const recentEvents = await db
        .select()
        .from(events)
        .where(
          and(
            eq(events.agent_id, baseline.agent_id),
            gte(events.timestamp, windowStart)
          )
        )
        .orderBy(desc(events.timestamp))
        .limit(100);

      if (recentEvents.length === 0) continue;

      const result = await scoreAnomaly(
        recentEvents as any,
        baseline.profile as unknown as BaselineProfile
      );
      if (!result) continue;

      checked++;

      // Create alert for high scores
      if (result.classification === "alert" || result.classification === "critical") {
        const severity = result.classification === "critical" ? "critical" : "elevated";
        const [alert] = await db.insert(alerts).values({
          user_id: baseline.user_id,
          agent_id: baseline.agent_id,
          severity,
          message: `Anomaly detected (score: ${result.score}): ${result.explanation}`,
          context: {
            anomaly_score: result.score,
            classification: result.classification,
            explanation: result.explanation,
          },
        }).returning();

        await alertQueue.add("deliver", {
          alertId: alert.id,
          userId: baseline.user_id,
          severity,
        });

        // Auto-kill on critical (only if user has kill switch feature)
        if (result.classification === "critical") {
          const [user] = await db.select().from(users).where(eq(users.id, baseline.user_id));
          const tier = (user?.tier || "free") as any;
          if (!TIER_FEATURES[tier as keyof typeof TIER_FEATURES]?.killSwitch) continue;
          await db
            .update(agents)
            .set({
              status: "paused",
              kill_reason: `Anomaly score ${result.score}: ${result.explanation}`,
            })
            .where(eq(agents.id, baseline.agent_id));

          const [killedAgent] = await db.select({ agent_id: agents.agent_id }).from(agents).where(eq(agents.id, baseline.agent_id));
          sendKill(
            baseline.user_id,
            `Critical anomaly (score: ${result.score}): ${result.explanation}`,
            undefined,
            killedAgent?.agent_id
          );
        }
      }
    }

    return { checked };
  });
}

import { createWorker } from "./queue.js";
import type { Job } from "bullmq";
import { getDb } from "../db/client.js";
import { rules, events, alerts, users } from "../db/schema.js";
import { eq, and, gte, desc } from "drizzle-orm";
import { evaluateNLRule } from "../rules/nl-evaluator.js";
import { isDegraded } from "../ai/haiku-client.js";
import { TIER_FEATURES, NL_EVAL_INTERVAL_MINUTES, type Tier } from "@clawnitor/shared";

export function startNLBatchWorker() {
  return createWorker("nl-eval", async (job: Job) => {
    if (isDegraded()) {
      console.warn("Skipping NL evaluation — Haiku API degraded");
      return { skipped: true };
    }

    const db = getDb();
    const windowStart = new Date(
      Date.now() - NL_EVAL_INTERVAL_MINUTES * 60 * 1000
    );

    // Find all paid users with NL rules
    const allUsers = await db.select().from(users);
    const paidUsers = allUsers.filter((u) => {
      const tier = u.tier as Tier;
      return TIER_FEATURES[tier].nlRules;
    });

    let totalEvaluated = 0;

    for (const user of paidUsers) {
      // Get NL rules for this user
      const nlRules = await db
        .select()
        .from(rules)
        .where(
          and(
            eq(rules.user_id, user.id),
            eq(rules.rule_type, "nl"),
            eq(rules.enabled, true)
          )
        );

      if (nlRules.length === 0) continue;

      // Get recent events
      const recentEvents = await db
        .select()
        .from(events)
        .where(
          and(eq(events.user_id, user.id), gte(events.timestamp, windowStart))
        )
        .orderBy(desc(events.timestamp))
        .limit(100);

      if (recentEvents.length === 0) continue;

      // Evaluate each NL rule
      for (const rule of nlRules) {
        const ruleText = (rule.config as any).promptText || "";
        if (!ruleText) continue;

        const result = await evaluateNLRule(recentEvents as any, ruleText);
        totalEvaluated++;

        if (result.triggered && result.confidence > 0.7) {
          await db.insert(alerts).values({
            user_id: user.id,
            rule_id: rule.id,
            severity: "elevated",
            message: `NL Rule "${rule.name}" triggered: ${result.explanation}`,
            context: {
              rule_name: rule.name,
              confidence: result.confidence,
              explanation: result.explanation,
            },
          });
        }
      }
    }

    return { evaluated: totalEvaluated };
  });
}

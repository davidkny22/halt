import { createWorker, createQueue } from "./queue.js";
import type { Job } from "bullmq";
import { getDb } from "../db/client.js";
import { rules, alerts, users, agents } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { sendKill } from "../ws/kill-server.js";
import { TIER_FEATURES, type Tier } from "@clawnitor/shared";
import { evaluateRules, type RuleWithId } from "../rules/engine.js";
import type { ClawnitorEvent, RuleConfig } from "@clawnitor/shared";

export function startEventProcessor() {
  const alertQueue = createQueue("alerts");

  return createWorker("events", async (job: Job) => {
    const { events, userId } = job.data as {
      events: ClawnitorEvent[];
      userId: string;
    };

    if (events.length === 0) return { processed: 0, alerts: 0 };

    const db = getDb();

    // Load user's active rules
    const userRules = await db
      .select()
      .from(rules)
      .where(eq(rules.user_id, userId));

    const activeRules = userRules
      .filter((r) => r.enabled)
      .map(
        (r): RuleWithId => ({
          id: r.id,
          name: r.name,
          config: r.config as RuleConfig,
        })
      );

    if (activeRules.length === 0) {
      return { processed: events.length, alerts: 0 };
    }

    // Evaluate rules against events
    const results = evaluateRules(events, activeRules);
    const triggered = results.filter((r) => r.triggered);

    // Create alert records for triggered rules
    for (const result of triggered) {
      const severity = determineSeverity(result.rule.config);

      const [alert] = await db
        .insert(alerts)
        .values({
          user_id: userId,
          rule_id: result.rule.id,
          agent_id: null, // Could be derived from events
          severity: severity as any,
          message: `Rule "${result.rule.name}" triggered: ${result.context || "condition met"}`,
          context: {
            rule_name: result.rule.name,
            rule_config: result.rule.config,
            trigger_context: result.context,
            event_count: events.length,
          },
        })
        .returning();

      // Auto-kill on critical severity if user has kill switch enabled
      if (severity === "critical") {
        const [user] = await db.select().from(users).where(eq(users.id, userId));
        const tier = user?.tier as Tier | undefined;
        if (tier && TIER_FEATURES[tier].killSwitch) {
          // Find the agent and pause it
          const agentId = events[0]?.agent_id;
          if (agentId) {
            const [agent] = await db
              .select()
              .from(agents)
              .where(eq(agents.agent_id, agentId));
            if (agent) {
              await db
                .update(agents)
                .set({
                  status: "paused",
                  kill_reason: `Auto-killed: ${result.rule.name} — ${result.context}`,
                })
                .where(eq(agents.id, agent.id));
              sendKill(
                userId,
                `Rule "${result.rule.name}" triggered: ${result.context}`,
                result.rule.id
              );
            }
          }
        }
      }

      // Enqueue alert for delivery
      await alertQueue.add("deliver", {
        alertId: alert.id,
        userId,
        severity,
      });
    }

    return { processed: events.length, alerts: triggered.length };
  });
}

function determineSeverity(config: RuleConfig): "normal" | "elevated" | "critical" {
  // Threshold rules with high spend are critical
  if (config.type === "threshold" && config.field === "cost_usd") {
    return "critical";
  }
  // Rate rules suggest elevated activity
  if (config.type === "rate") {
    return "elevated";
  }
  // Keyword rules depend on context
  return "elevated";
}

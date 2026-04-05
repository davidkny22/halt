import { createWorker, createQueue } from "./queue.js";
import type { Job } from "bullmq";
import { getDb } from "../db/client.js";
import { rules, alerts, users, agents, saves, events as eventsTable } from "../db/schema.js";
import { eq, and, sql, gte, desc } from "drizzle-orm";
import { sendKill } from "../ws/kill-server.js";
import { TIER_FEATURES, type Tier } from "@halt/shared";
import { evaluateRules, type RuleWithId } from "../rules/engine.js";
import type { HaltEvent, RuleConfig } from "@halt/shared";

export function startEventProcessor() {
  const alertQueue = createQueue("alerts");

  return createWorker("events", async (job: Job) => {
    const { events, userId } = job.data as {
      events: HaltEvent[];
      userId: string;
    };

    if (events.length === 0) return { processed: 0, alerts: 0 };

    const db = getDb();

    // Load user's personal rules + team shared rules
    const userRules = await db
      .select()
      .from(rules)
      .where(eq(rules.user_id, userId));

    // Also load shared rules from teams the user belongs to
    let sharedRules: any[] = [];
    try {
      const rawShared = await db.execute(sql`
        SELECT sr.* FROM shared_rules sr
        JOIN team_members tm ON tm.team_id = sr.team_id
        WHERE tm.user_id = ${userId} AND sr.enabled = true
      `);
      sharedRules = (rawShared as any[]).map((r) => ({
        ...r,
        agent_ids: r.scope || null, // Map scope → agent_ids
      }));
    } catch {}

    const allRules = [...userRules, ...sharedRules];

    const enabledRules = allRules
      .filter((r: any) => r.enabled)
      .map((r: any) => ({
        id: r.id,
        name: r.name,
        config: r.config as RuleConfig,
        action_mode: r.action_mode || "both",
        agent_ids: r.agent_ids as string[] | null,
      }));

    if (enabledRules.length === 0) {
      return { processed: events.length, alerts: 0 };
    }

    // Group events by agent_id and evaluate only applicable rules per agent
    const eventsByAgent = new Map<string, HaltEvent[]>();
    for (const event of events) {
      const aid = event.agent_id;
      if (!eventsByAgent.has(aid)) eventsByAgent.set(aid, []);
      eventsByAgent.get(aid)!.push(event);
    }

    const triggered: Array<{ rule: RuleWithId; context?: string; triggered: boolean; agentExtId: string }> = [];

    for (const [agentExtId, agentEvents] of eventsByAgent) {
      const applicableRules: RuleWithId[] = enabledRules
        .filter((r) => !r.agent_ids || r.agent_ids.length === 0 || r.agent_ids.includes(agentExtId))
        .map((r) => ({ id: r.id, name: r.name, config: r.config, action_mode: r.action_mode }));

      if (applicableRules.length === 0) continue;

      // For rate/threshold rules, fetch historical events from DB for the time window
      const maxWindow = Math.max(
        ...applicableRules
          .filter((r) => r.config.type === "rate" || r.config.type === "threshold")
          .map((r) => (r.config as any).windowMinutes || 60),
        0
      );

      let evalEvents = agentEvents;
      if (maxWindow > 0) {
        // Look up the agent's DB ID to query historical events
        const [agentRow] = await db
          .select({ id: agents.id })
          .from(agents)
          .where(and(eq(agents.user_id, userId), eq(agents.agent_id, agentExtId)))
          .limit(1);

        if (agentRow) {
          const windowStart = new Date(Date.now() - maxWindow * 60 * 1000);
          const historicalEvents = await db
            .select()
            .from(eventsTable)
            .where(and(
              eq(eventsTable.user_id, userId),
              eq(eventsTable.agent_id, agentRow.id),
              gte(eventsTable.timestamp, windowStart)
            ))
            .orderBy(desc(eventsTable.timestamp))
            .limit(500);

          // Merge historical with current batch (dedup by event_id)
          const seenIds = new Set(historicalEvents.map((e) => e.id));
          const newEvents = agentEvents.filter((e) => !seenIds.has(e.event_id));
          evalEvents = [
            ...historicalEvents.map((e) => ({
              agent_id: agentExtId,
              session_id: e.session_id,
              timestamp: e.timestamp.toISOString(),
              event_type: e.event_type as any,
              action: e.action,
              target: e.target,
              metadata: e.metadata as any,
              severity_hint: e.severity_hint as any,
              event_id: e.id,
              plugin_version: e.plugin_version || "unknown",
            })),
            ...newEvents,
          ];
        }
      }

      const results = evaluateRules(evalEvents, applicableRules);
      triggered.push(...results.filter((r) => r.triggered).map((r) => ({ ...r, agentExtId })));
    }

    // Create alert records for triggered rules
    for (const result of triggered) {
      const severity = determineSeverity(result.rule.config);
      const mode = result.rule.action_mode || "both";
      const shouldAlert = mode === "alert" || mode === "both";
      const shouldBlock = mode === "block" || mode === "both";

      // Only create alert record if mode includes alerting
      let alert: any = null;
      if (shouldAlert) {
        [alert] = await db
          .insert(alerts)
          .values({
            user_id: userId,
            rule_id: result.rule.id,
            agent_id: null,
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
      }

      // Auto-kill on critical severity if user has kill switch AND agent has auto-kill enabled
      if (severity === "critical" && shouldBlock) {
        const [user] = await db.select().from(users).where(eq(users.id, userId));
        const tier = user?.tier as Tier | undefined;
        if (tier && TIER_FEATURES[tier].killSwitch) {
          const agentId = result.agentExtId;
          if (agentId) {
            const [agent] = await db
              .select()
              .from(agents)
              .where(and(eq(agents.user_id, userId), eq(agents.agent_id, agentId)));
            if (agent && agent.auto_kill_enabled) {
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
                result.rule.id,
                agentId
              );

              // Record the save
              await db.insert(saves).values({
                user_id: userId,
                agent_id: agent.id,
                rule_id: result.rule.id,
                action_blocked: eventsByAgent.get(agentId)?.[0]?.action || "Unknown action",
                potential_impact: estimateImpact(result.rule.config, result.context),
                source: "auto-kill",
              });
            }
          }
        }
      }

      // Enqueue alert for delivery (only if alert was created)
      if (alert) {
        await alertQueue.add("deliver", {
          alertId: alert.id,
          userId,
          severity,
        });
      }
    }

    return { processed: events.length, alerts: triggered.length };
  });
}

function estimateImpact(config: RuleConfig, context?: string): string {
  if (config.type === "threshold" && config.field === "cost_usd") {
    return `Would have continued spending beyond $${config.value} limit`;
  }
  if (config.type === "rate") {
    return `Rate limit exceeded — action frequency would have continued escalating`;
  }
  if (config.type === "keyword") {
    return `Blocked dangerous command before execution`;
  }
  return context || "Prevented potentially harmful action";
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

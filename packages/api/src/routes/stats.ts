import type { FastifyInstance } from "fastify";
import { eq, and, gte, count, sql } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { events, alerts, agents } from "../db/schema.js";
import { authenticateAny as authenticateApiKey } from "../auth/middleware.js";

export async function statsRoutes(app: FastifyInstance) {
  app.get("/api/stats", {
    preHandler: [authenticateApiKey],
    handler: async (request, reply) => {
      const db = getDb();
      const userId = request.userId!;
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      // Events today
      const [{ value: eventsToday }] = await db
        .select({ value: count() })
        .from(events)
        .where(
          and(eq(events.user_id, userId), gte(events.timestamp, todayStart))
        );

      // Alerts today
      const [{ value: alertsToday }] = await db
        .select({ value: count() })
        .from(alerts)
        .where(
          and(eq(alerts.user_id, userId), gte(alerts.created_at, todayStart))
        );

      // Spend today (sum of cost_usd from event metadata)
      const [spendResult] = await db
        .select({
          value: sql<number>`COALESCE(SUM((${events.metadata}->>'cost_usd')::numeric), 0)`,
        })
        .from(events)
        .where(
          and(eq(events.user_id, userId), gte(events.timestamp, todayStart))
        );

      // Active agents
      const [{ value: agentsActive }] = await db
        .select({ value: count() })
        .from(agents)
        .where(and(eq(agents.user_id, userId), eq(agents.status, "active")));

      // Weekly stats for trends
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);
      weekStart.setHours(0, 0, 0, 0);

      const lastWeekStart = new Date();
      lastWeekStart.setDate(lastWeekStart.getDate() - 14);
      lastWeekStart.setHours(0, 0, 0, 0);

      const [{ value: eventsThisWeek }] = await db
        .select({ value: count() })
        .from(events)
        .where(
          and(eq(events.user_id, userId), gte(events.timestamp, weekStart))
        );

      const [spendWeekResult] = await db
        .select({
          value: sql<number>`COALESCE(SUM((${events.metadata}->>'cost_usd')::numeric), 0)`,
        })
        .from(events)
        .where(
          and(eq(events.user_id, userId), gte(events.timestamp, weekStart))
        );

      const [spendLastWeekResult] = await db
        .select({
          value: sql<number>`COALESCE(SUM((${events.metadata}->>'cost_usd')::numeric), 0)`,
        })
        .from(events)
        .where(
          and(
            eq(events.user_id, userId),
            gte(events.timestamp, lastWeekStart),
            sql`${events.timestamp} < ${weekStart.toISOString()}::timestamptz`
          )
        );

      // Daily spend for last 7 days (for chart)
      const dailySpend = await db
        .select({
          day: sql<string>`date_trunc('day', ${events.timestamp})::date::text`,
          spend: sql<number>`COALESCE(SUM((${events.metadata}->>'cost_usd')::numeric), 0)`,
          event_count: count(),
        })
        .from(events)
        .where(
          and(eq(events.user_id, userId), gte(events.timestamp, weekStart))
        )
        .groupBy(sql`date_trunc('day', ${events.timestamp})`)
        .orderBy(sql`date_trunc('day', ${events.timestamp})`);

      // Last event timestamp
      const [lastEvent] = await db
        .select({ ts: events.timestamp })
        .from(events)
        .where(eq(events.user_id, userId))
        .orderBy(sql`${events.timestamp} DESC`)
        .limit(1);

      const spendThisWeek = Number(spendWeekResult?.value || 0);
      const spendLastWeek = Number(spendLastWeekResult?.value || 0);
      const spendTrend = spendLastWeek > 0
        ? Math.round(((spendThisWeek - spendLastWeek) / spendLastWeek) * 100)
        : 0;

      return reply.send({
        events_today: Number(eventsToday),
        alerts_today: Number(alertsToday),
        spend_today: Number(spendResult?.value || 0),
        agents_active: Number(agentsActive),
        events_this_week: Number(eventsThisWeek),
        spend_this_week: spendThisWeek,
        spend_trend: spendTrend,
        daily_spend: dailySpend.map((d) => ({
          day: d.day,
          spend: Number(d.spend),
          events: Number(d.event_count),
        })),
        last_event_at: lastEvent?.ts?.toISOString() || null,
      });
    },
  });
}

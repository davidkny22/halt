import type { FastifyInstance } from "fastify";
import { eq, sql, desc, and } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { events, agents } from "../db/schema.js";
import { authenticateAny as authenticateApiKey } from "../auth/middleware.js";

export async function spendRoutes(app: FastifyInstance) {
  // Get spend summary — per agent, per day, totals
  app.get("/api/spend", {
    preHandler: [authenticateApiKey],
    handler: async (request, reply) => {
      const db = getDb();
      const userId = request.userId!;
      const { days = "7" } = request.query as { days?: string };
      const dayCount = Math.min(parseInt(days, 10) || 7, 90);

      // Total spend last N days
      const [total] = await db
        .select({
          cost: sql<number>`coalesce(sum((${events.metadata}->>'cost_usd')::numeric), 0)::float`,
          tokens: sql<number>`coalesce(sum((${events.metadata}->>'tokens_used')::int), 0)::int`,
          event_count: sql<number>`count(*)::int`,
        })
        .from(events)
        .where(
          and(
            eq(events.user_id, userId),
            sql`${events.timestamp} > now() - interval '1 day' * ${dayCount}`
          )
        );

      // Spend per agent
      const perAgent = await db
        .select({
          agent_id: events.agent_id,
          agent_name: agents.name,
          cost: sql<number>`coalesce(sum((${events.metadata}->>'cost_usd')::numeric), 0)::float`,
          tokens: sql<number>`coalesce(sum((${events.metadata}->>'tokens_used')::int), 0)::int`,
          event_count: sql<number>`count(*)::int`,
        })
        .from(events)
        .leftJoin(agents, eq(events.agent_id, agents.id))
        .where(
          and(
            eq(events.user_id, userId),
            sql`${events.timestamp} > now() - interval '1 day' * ${dayCount}`
          )
        )
        .groupBy(events.agent_id, agents.name)
        .orderBy(desc(sql`sum((${events.metadata}->>'cost_usd')::numeric)`));

      // Spend per day
      const perDay = await db
        .select({
          day: sql<string>`date_trunc('day', ${events.timestamp})::date::text`,
          cost: sql<number>`coalesce(sum((${events.metadata}->>'cost_usd')::numeric), 0)::float`,
          tokens: sql<number>`coalesce(sum((${events.metadata}->>'tokens_used')::int), 0)::int`,
          event_count: sql<number>`count(*)::int`,
        })
        .from(events)
        .where(
          and(
            eq(events.user_id, userId),
            sql`${events.timestamp} > now() - interval '1 day' * ${dayCount}`
          )
        )
        .groupBy(sql`date_trunc('day', ${events.timestamp})`)
        .orderBy(sql`date_trunc('day', ${events.timestamp})`);

      // Spend per session (last 20 sessions)
      const perSession = await db
        .select({
          session_id: events.session_id,
          agent_name: agents.name,
          cost: sql<number>`coalesce(sum((${events.metadata}->>'cost_usd')::numeric), 0)::float`,
          tokens: sql<number>`coalesce(sum((${events.metadata}->>'tokens_used')::int), 0)::int`,
          event_count: sql<number>`count(*)::int`,
          started: sql<string>`min(${events.timestamp})::text`,
          ended: sql<string>`max(${events.timestamp})::text`,
        })
        .from(events)
        .leftJoin(agents, eq(events.agent_id, agents.id))
        .where(
          and(
            eq(events.user_id, userId),
            sql`${events.timestamp} > now() - interval '1 day' * ${dayCount}`
          )
        )
        .groupBy(events.session_id, agents.name)
        .orderBy(desc(sql`max(${events.timestamp})`))
        .limit(20);

      // Top costly events (individual tool calls with highest cost)
      const topEvents = await db
        .select({
          id: events.id,
          event_type: events.event_type,
          action: events.action,
          target: events.target,
          cost: sql<number>`(${events.metadata}->>'cost_usd')::float`,
          tokens: sql<number>`(${events.metadata}->>'tokens_used')::int`,
          model: sql<string>`${events.metadata}->>'model'`,
          timestamp: events.timestamp,
          agent_name: agents.name,
        })
        .from(events)
        .leftJoin(agents, eq(events.agent_id, agents.id))
        .where(
          and(
            eq(events.user_id, userId),
            sql`${events.timestamp} > now() - interval '1 day' * ${dayCount}`,
            sql`(${events.metadata}->>'cost_usd') IS NOT NULL`
          )
        )
        .orderBy(desc(sql`(${events.metadata}->>'cost_usd')::numeric`))
        .limit(10);

      // Spend per model
      const perModel = await db
        .select({
          model: sql<string>`${events.metadata}->>'model'`,
          cost: sql<number>`coalesce(sum((${events.metadata}->>'cost_usd')::numeric), 0)::float`,
          tokens: sql<number>`coalesce(sum((${events.metadata}->>'tokens_used')::int), 0)::int`,
          event_count: sql<number>`count(*)::int`,
        })
        .from(events)
        .where(
          and(
            eq(events.user_id, userId),
            sql`${events.timestamp} > now() - interval '1 day' * ${dayCount}`,
            sql`${events.metadata}->>'model' IS NOT NULL`
          )
        )
        .groupBy(sql`${events.metadata}->>'model'`)
        .orderBy(desc(sql`sum((${events.metadata}->>'cost_usd')::numeric)`))
        .limit(10);

      // Spend per tool
      const perTool = await db
        .select({
          tool_name: sql<string>`${events.metadata}->>'tool_name'`,
          cost: sql<number>`coalesce(sum((${events.metadata}->>'cost_usd')::numeric), 0)::float`,
          tokens: sql<number>`coalesce(sum((${events.metadata}->>'tokens_used')::int), 0)::int`,
          event_count: sql<number>`count(*)::int`,
        })
        .from(events)
        .where(
          and(
            eq(events.user_id, userId),
            sql`${events.timestamp} > now() - interval '1 day' * ${dayCount}`,
            sql`${events.metadata}->>'tool_name' IS NOT NULL`
          )
        )
        .groupBy(sql`${events.metadata}->>'tool_name'`)
        .orderBy(desc(sql`sum((${events.metadata}->>'cost_usd')::numeric)`))
        .limit(10);

      return reply.send({
        period_days: dayCount,
        total: {
          cost: total?.cost || 0,
          tokens: total?.tokens || 0,
          events: total?.event_count || 0,
        },
        by_agent: perAgent,
        by_day: perDay,
        by_session: perSession,
        by_model: perModel,
        by_tool: perTool,
        top_events: topEvents,
      });
    },
  });
}

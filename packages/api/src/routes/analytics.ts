import type { FastifyInstance } from "fastify";
import { eq, sql, desc } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { pageViews } from "../db/schema.js";
import { authenticateInternal } from "../auth/middleware.js";

export async function analyticsRoutes(app: FastifyInstance) {
  // Track a page view (no auth — called from landing page)
  app.post("/api/track", {
    handler: async (request, reply) => {
      const { path, referrer, user_agent, session_id, screen_width } =
        request.body as {
          path?: string;
          referrer?: string;
          user_agent?: string;
          session_id?: string;
          screen_width?: number;
        };

      if (!path) {
        return reply.status(400).send({ error: "path required" });
      }

      const db = getDb();

      // Extract country from CF header if available
      const country =
        (request.headers["cf-ipcountry"] as string) ||
        (request.headers["x-vercel-ip-country"] as string) ||
        null;

      // Derive device type from screen width
      let deviceType: string | null = null;
      if (screen_width) {
        if (screen_width < 768) deviceType = "mobile";
        else if (screen_width < 1024) deviceType = "tablet";
        else deviceType = "desktop";
      }

      await db.insert(pageViews).values({
        path: path.slice(0, 255),
        referrer: referrer?.slice(0, 500) || null,
        country: country?.slice(0, 2) || null,
        user_agent: user_agent?.slice(0, 500) || null,
        session_id: session_id?.slice(0, 36) || null,
        device_type: deviceType,
      });

      return reply.status(204).send();
    },
  });

  // Get analytics summary (internal only — dashboard admin)
  app.get("/api/analytics", {
    preHandler: [authenticateInternal],
    handler: async (request, reply) => {
      const db = getDb();

      // Views in last 24h grouped by path
      const views = await db
        .select({
          path: pageViews.path,
          count: sql<number>`count(*)::int`,
        })
        .from(pageViews)
        .where(sql`${pageViews.created_at} > now() - interval '24 hours'`)
        .groupBy(pageViews.path)
        .orderBy(desc(sql`count(*)`));

      // Total views last 24h
      const [total] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(pageViews)
        .where(sql`${pageViews.created_at} > now() - interval '24 hours'`);

      // Views last 7 days by day
      const daily = await db
        .select({
          day: sql<string>`date_trunc('day', ${pageViews.created_at})::date::text`,
          count: sql<number>`count(*)::int`,
        })
        .from(pageViews)
        .where(sql`${pageViews.created_at} > now() - interval '7 days'`)
        .groupBy(sql`date_trunc('day', ${pageViews.created_at})`)
        .orderBy(sql`date_trunc('day', ${pageViews.created_at})`);

      // Top referrers last 24h
      const referrers = await db
        .select({
          referrer: pageViews.referrer,
          count: sql<number>`count(*)::int`,
        })
        .from(pageViews)
        .where(
          sql`${pageViews.created_at} > now() - interval '24 hours' AND ${pageViews.referrer} IS NOT NULL`
        )
        .groupBy(pageViews.referrer)
        .orderBy(desc(sql`count(*)`))
        .limit(10);

      // Unique sessions last 24h
      const [sessions] = await db
        .select({ count: sql<number>`count(distinct ${pageViews.session_id})::int` })
        .from(pageViews)
        .where(sql`${pageViews.created_at} > now() - interval '24 hours' AND ${pageViews.session_id} IS NOT NULL`);

      // Device breakdown last 24h
      const devices = await db
        .select({
          device_type: pageViews.device_type,
          count: sql<number>`count(*)::int`,
        })
        .from(pageViews)
        .where(sql`${pageViews.created_at} > now() - interval '24 hours' AND ${pageViews.device_type} IS NOT NULL`)
        .groupBy(pageViews.device_type)
        .orderBy(desc(sql`count(*)`));

      // Hourly breakdown last 24h
      const hourly = await db
        .select({
          hour: sql<string>`to_char(${pageViews.created_at}, 'HH24:00')`,
          count: sql<number>`count(*)::int`,
        })
        .from(pageViews)
        .where(sql`${pageViews.created_at} > now() - interval '24 hours'`)
        .groupBy(sql`to_char(${pageViews.created_at}, 'HH24:00')`)
        .orderBy(sql`to_char(${pageViews.created_at}, 'HH24:00')`);

      return reply.send({
        last_24h: total?.count || 0,
        unique_sessions: sessions?.count || 0,
        by_page: views,
        by_day: daily,
        by_hour: hourly,
        by_device: devices,
        top_referrers: referrers,
      });
    },
  });
}

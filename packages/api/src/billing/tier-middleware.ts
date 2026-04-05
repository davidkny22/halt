import type { FastifyRequest, FastifyReply } from "fastify";
import { eq } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { users } from "../db/schema.js";
import { TIER_FEATURES, type Tier } from "@clawnitor/shared";

const TRIAL_DURATION_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

export function requireTier(feature: keyof typeof TIER_FEATURES.free) {
  return async function (request: FastifyRequest, reply: FastifyReply) {
    if (!request.userId) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    const db = getDb();
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, request.userId));

    if (!user) {
      return reply.status(401).send({ error: "User not found" });
    }

    let tier = user.tier as Tier;

    // Check trial expiration
    if (tier === "trial" && user.trial_started_at) {
      const elapsed = Date.now() - user.trial_started_at.getTime();
      if (elapsed > TRIAL_DURATION_MS) {
        // Trial expired — downgrade to free
        await db
          .update(users)
          .set({ tier: "free", updated_at: new Date() })
          .where(eq(users.id, user.id));
        tier = "free";
      }
    }

    const features = TIER_FEATURES[tier];
    const hasFeature = features[feature as keyof typeof features];

    if (!hasFeature) {
      return reply.status(403).send({
        error: "Upgrade Required",
        message: `This feature requires a Pro subscription. Upgrade at https://clawnitor.io/settings`,
        feature,
        currentTier: tier,
      });
    }
  };
}

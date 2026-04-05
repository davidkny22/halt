import type { FastifyRequest, FastifyReply } from "fastify";
import { eq } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { users } from "../db/schema.js";
import { TIER_FEATURES, type Tier } from "@halt/shared";

const TRIAL_DURATION_MS = 14 * 24 * 60 * 60 * 1000; // 14 days
const EXTENDED_TRIAL_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days (beta consolation)

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

    // Check trial expiration (30 days for extended beta consolation, 14 days standard)
    if (tier === "trial" && user.trial_started_at) {
      const duration = user.beta_code === "EXTENDED_TRIAL"
        ? EXTENDED_TRIAL_DURATION_MS
        : TRIAL_DURATION_MS;
      const elapsed = Date.now() - user.trial_started_at.getTime();
      if (elapsed > duration) {
        // Trial expired — downgrade to free
        await db
          .update(users)
          .set({ tier: "free", updated_at: new Date() })
          .where(eq(users.id, user.id));
        tier = "free";
      }
    }

    // Check beta expiration
    if (tier === "paid" && user.beta_code && user.beta_expires_at) {
      if (Date.now() > user.beta_expires_at.getTime()) {
        // Beta expired — downgrade to free, keep beta_code for founding member record
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
        message: `This feature requires a Pro subscription. Upgrade at https://halt.dev/settings`,
        feature,
        currentTier: tier,
      });
    }
  };
}

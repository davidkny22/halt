import { createWorker } from "./queue.js";
import type { Job } from "bullmq";
import { getDb } from "../db/client.js";
import { users, agents, events } from "../db/schema.js";
import { eq, count, and, gte, sql } from "drizzle-orm";
import { getStripe, PRICE_IDS } from "../billing/stripe.js";

export function startUsageSyncWorker() {
  return createWorker("usage-sync", async (job: Job) => {
    const db = getDb();
    const stripe = getStripe();
    if (!stripe) return { skipped: true, reason: "Stripe not configured" };

    // Find all paid/trial users with Stripe subscriptions
    const paidUsers = await db
      .select()
      .from(users)
      .where(eq(users.tier, "paid"));

    const trialUsers = await db
      .select()
      .from(users)
      .where(eq(users.tier, "trial"));

    let synced = 0;

    for (const user of [...paidUsers, ...trialUsers]) {
      if (!user.stripe_customer_id) continue;

      // Count billable units: unique agent_id + session_id pairs
      // that sent events in the current billing period (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const [{ value: activeUnitCount }] = await db
        .select({
          value: sql<number>`COUNT(DISTINCT (${events.agent_id} || ':' || ${events.session_id}))`,
        })
        .from(events)
        .where(
          and(
            eq(events.user_id, user.id),
            gte(events.timestamp, thirtyDaysAgo)
          )
        );

      const agentCount = Number(activeUnitCount) || 0;
      if (agentCount <= 1) continue; // First agent is included in base price

      try {
        // Get active subscription
        const subscriptions = await stripe.subscriptions.list({
          customer: user.stripe_customer_id,
          status: "active",
          limit: 1,
        });

        if (subscriptions.data.length === 0) continue;

        const subscription = subscriptions.data[0];

        // Check if additional agent line item exists
        const additionalAgentItem = subscription.items.data.find(
          (item) =>
            item.price.id === PRICE_IDS.pro.additionalAgent ||
            item.price.id === PRICE_IDS.team.additionalAgent
        );

        const additionalAgents = agentCount - 1; // First agent covered by base price

        if (additionalAgentItem) {
          // Update quantity
          if (additionalAgentItem.quantity !== additionalAgents) {
            await stripe.subscriptionItems.update(additionalAgentItem.id, {
              quantity: additionalAgents,
            });
            synced++;
          }
        } else if (additionalAgents > 0) {
          // Add the additional agent line item to subscription
          const isTeam = subscription.items.data.some(
            (item) => item.price.id === PRICE_IDS.team.base
          );

          await stripe.subscriptionItems.create({
            subscription: subscription.id,
            price: isTeam
              ? PRICE_IDS.team.additionalAgent
              : PRICE_IDS.pro.additionalAgent,
            quantity: additionalAgents,
          });
          synced++;
        }
      } catch (err) {
        console.error(
          "Usage sync failed for user:",
          user.id,
          (err as Error).message
        );
      }
    }

    return { synced };
  });
}

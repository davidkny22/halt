import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { users } from "../db/schema.js";
import { authenticateAny as authenticateApiKey } from "../auth/middleware.js";
import { createCheckoutSession, createPortalSession, getStripe } from "../billing/stripe.js";
import { getConfig } from "../config.js";
import { seedShieldRules } from "../db/seed-shield.js";

export async function billingRoutes(app: FastifyInstance) {
  app.post("/api/billing/checkout", {
    preHandler: [authenticateApiKey],
    handler: async (request, reply) => {
      const db = getDb();
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, request.userId!));

      if (!user) {
        return reply.status(404).send({ error: "User not found" });
      }

      const { plan } = (request.body as { plan?: "pro" | "team" }) || {};
      const url = await createCheckoutSession(
        user.id,
        user.email,
        plan || "pro",
        user.stripe_customer_id ?? undefined
      );

      if (!url) {
        return reply.status(500).send({ error: "Billing not configured" });
      }

      return reply.send({ url });
    },
  });

  app.post("/api/billing/portal", {
    preHandler: [authenticateApiKey],
    handler: async (request, reply) => {
      const db = getDb();
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, request.userId!));

      if (!user?.stripe_customer_id) {
        return reply.status(400).send({ error: "No active subscription" });
      }

      const url = await createPortalSession(user.stripe_customer_id);
      if (!url) {
        return reply.status(500).send({ error: "Billing not configured" });
      }

      return reply.send({ url });
    },
  });

  // Stripe webhook
  app.post("/api/billing/webhook", {
    config: { rawBody: true },
    handler: async (request: any, reply) => {
      const stripe = getStripe();
      const config = getConfig();
      if (!stripe || !config.STRIPE_WEBHOOK_SECRET) {
        return reply.status(500).send({ error: "Billing not configured" });
      }

      const sig = request.headers["stripe-signature"] as string;
      const body = request.rawBody;
      if (!body) {
        return reply.status(400).send({ error: "Missing raw body" });
      }

      let event;

      try {
        event = stripe.webhooks.constructEvent(
          body,
          sig,
          config.STRIPE_WEBHOOK_SECRET
        );
      } catch {
        return reply.status(400).send({ error: "Invalid webhook signature" });
      }

      const db = getDb();

      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object;
          const userId = session.metadata?.userId;
          const plan = session.metadata?.plan;
          if (userId && session.customer) {
            await db
              .update(users)
              .set({
                tier: plan === "team" ? "team" : "paid",
                stripe_customer_id: session.customer as string,
                updated_at: new Date(),
              })
              .where(eq(users.id, userId));

            // Seed Shield rules for newly paid user
            seedShieldRules(userId).catch((err) =>
              request.log.error("Failed to seed Shield rules: %s", (err as Error).message)
            );
          }
          break;
        }

        case "customer.subscription.deleted": {
          const sub = event.data.object;
          const customerId = sub.customer as string;
          await db
            .update(users)
            .set({ tier: "free", updated_at: new Date() })
            .where(eq(users.stripe_customer_id, customerId));
          break;
        }

        case "invoice.payment_failed": {
          // 7-day grace period — don't downgrade immediately
          // The subscription.deleted event handles actual cancellation
          request.log.warn("Payment failed for customer: %s", event.data.object.customer);
          break;
        }
      }

      return reply.send({ received: true });
    },
  });

  // Start free trial
  app.post("/api/billing/start-trial", {
    preHandler: [authenticateApiKey],
    handler: async (request, reply) => {
      const db = getDb();
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, request.userId!));

      if (!user) {
        return reply.status(404).send({ error: "User not found" });
      }

      if (user.tier !== "free") {
        return reply.status(400).send({ error: "Trial only available for free tier users" });
      }

      if (user.trial_started_at) {
        return reply.status(400).send({ error: "Trial already used" });
      }

      await db
        .update(users)
        .set({
          tier: "trial",
          trial_started_at: new Date(),
          updated_at: new Date(),
        })
        .where(eq(users.id, user.id));

      // Seed Shield rules for trial users
      seedShieldRules(user.id).catch(() => {});

      return reply.send({ tier: "trial", trial_started_at: new Date().toISOString() });
    },
  });
}

import type { FastifyInstance } from "fastify";
import { eq, count, sql } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { betaCodes, betaRedemptions, users } from "../db/schema.js";
import { authenticateAny } from "../auth/middleware.js";
import { z } from "zod";
import { Resend } from "resend";
import { getConfig } from "../config.js";
import { logger } from "../util/logger.js";
import { seedShieldRules } from "../db/seed-shield.js";

const BETA_DURATION_MONTHS = 6;
const EXTENDED_TRIAL_DAYS = 30;
const CONSOLATION_WINDOW_MS = 48 * 60 * 60 * 1000; // 48 hours

const redeemBody = z.object({
  code: z.string().min(1).max(32).trim(),
});

function getResend(): Resend | null {
  const config = getConfig();
  if (!config.RESEND_API_KEY) return null;
  return new Resend(config.RESEND_API_KEY);
}

async function sendBetaWelcomeEmail(email: string, expiresAt: Date, channel: string) {
  const resend = getResend();
  if (!resend) return;

  try {
    await resend.emails.send({
      from: "Halt <hello@halt.dev>",
      to: email,
      subject: "You're in! 6 months of Halt Pro, on us.",
      text: [
        "Welcome to the Halt beta!",
        "",
        "Your account has been upgraded to Pro — free for 6 months.",
        "",
        "What you get:",
        "- AI anomaly detection",
        "- Natural language rules (up to 5)",
        "- Unlimited kill switch",
        "- All alert channels (email, Telegram, Discord, SMS)",
        "- 90-day event history",
        "",
        `Your Pro access is active until ${expiresAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}.`,
        "After that, you'll lock in founding member pricing ($5/mo) forever.",
        "",
        "Get started: https://app.halt.dev",
        "Docs: https://halt.dev/docs",
        "",
        "We built this to keep your agents safe. Tell us what you think — the feedback widget is on every dashboard page.",
        "",
        "— David, founder of Halt",
      ].join("\n"),
    });
  } catch (err) {
    logger.error("Failed to send beta welcome email: %s", (err as Error).message);
  }
}

async function sendConsolationEmail(email: string, trialEndsAt: Date) {
  const resend = getResend();
  if (!resend) return;

  try {
    await resend.emails.send({
      from: "Halt <hello@halt.dev>",
      to: email,
      subject: "Beta's full — but we've got something for you.",
      text: [
        "All beta spots have been claimed — you just missed it.",
        "",
        "But because you showed up early, we've activated a 30-day extended trial",
        "of Halt Pro for your account (normally 14 days).",
        "",
        "What you get for 30 days:",
        "- AI anomaly detection",
        "- Natural language rules",
        "- Unlimited kill switch",
        "- All alert channels",
        "",
        `Your extended trial is active until ${trialEndsAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}.`,
        "",
        "Get started: https://app.halt.dev",
        "",
        "— David, founder of Halt",
      ].join("\n"),
    });
  } catch (err) {
    logger.error("Failed to send consolation email: %s", (err as Error).message);
  }
}

export async function betaRoutes(app: FastifyInstance) {
  app.post("/api/beta/redeem", {
    preHandler: [authenticateAny],
    handler: async (request, reply) => {
      const parsed = redeemBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "Bad Request",
          message: "Invalid code format",
        });
      }

      const db = getDb();
      const userId = request.userId!;
      const { code } = parsed.data;

      // Check if user already has beta access or active subscription
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId));

      if (user.beta_code) {
        return reply.status(409).send({
          error: "Already Redeemed",
          message: "You already have an active beta code.",
        });
      }

      if (user.tier === "paid" || user.tier === "team" || user.tier === "enterprise") {
        return reply.status(409).send({
          error: "Already Subscribed",
          message: "You already have an active subscription.",
        });
      }

      // Look up and redeem code atomically in a transaction
      const redeemResult = await db.transaction(async (tx) => {
        // Lock the code row to prevent concurrent redemptions
        const [invite] = await tx
          .select()
          .from(betaCodes)
          .where(eq(betaCodes.code, code.toUpperCase()))
          .for("update");

        if (!invite) return { status: "not_found" as const };

        // Check if user already redeemed any code
        const [existing] = await tx
          .select()
          .from(betaRedemptions)
          .where(eq(betaRedemptions.user_id, userId));

        if (existing) return { status: "already_redeemed" as const };

        // Count redemptions (inside lock, so no race)
        const [{ value: redeemed }] = await tx
          .select({ value: count() })
          .from(betaRedemptions)
          .where(eq(betaRedemptions.code_id, invite.id));

        if (redeemed >= invite.max_redemptions) return { status: "full" as const };

        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + BETA_DURATION_MONTHS);

        await tx
          .update(users)
          .set({
            tier: "paid",
            beta_code: code.toUpperCase(),
            beta_expires_at: expiresAt,
            updated_at: new Date(),
          })
          .where(eq(users.id, userId));

        await tx.insert(betaRedemptions).values({
          code_id: invite.id,
          user_id: userId,
          channel: invite.channel,
        });

        return {
          status: "ok" as const,
          invite,
          expiresAt,
          spotsLeft: invite.max_redemptions - Number(redeemed) - 1,
        };
      });

      if (redeemResult.status === "already_redeemed") {
        return reply.status(409).send({
          error: "Already Redeemed",
          message: "You've already redeemed a beta code.",
        });
      }

      if (redeemResult.status === "ok") {
        // Seed Shield rules for newly upgraded Pro user
        seedShieldRules(userId).catch((err) =>
          logger.error("Failed to seed Shield rules: %s", (err as Error).message)
        );

        if (user.email) {
          sendBetaWelcomeEmail(user.email, redeemResult.expiresAt, redeemResult.invite.channel);
        }

        return reply.send({
          success: true,
          type: "beta",
          tier: "paid",
          channel: redeemResult.invite.channel,
          beta_expires_at: redeemResult.expiresAt.toISOString(),
          spots_remaining: redeemResult.spotsLeft,
          message: `Beta access activated! You have free Pro access until ${redeemResult.expiresAt.toLocaleDateString()}. ${redeemResult.spotsLeft} spots remaining.`,
        });
      }

      // status === "not_found" or "full" — fall through to consolation

      // Code doesn't exist or is full — check if ALL codes are full
      const allCodes = await db.select().from(betaCodes);
      let allFull = allCodes.length > 0;
      let lastRedemptionTime = 0;

      for (const c of allCodes) {
        const [{ value: r }] = await db
          .select({ value: count() })
          .from(betaRedemptions)
          .where(eq(betaRedemptions.code_id, c.id));

        if (r < c.max_redemptions) {
          allFull = false;
          break;
        }
      }

      if (!allFull) {
        return reply.status(404).send({
          error: "Invalid Code",
          message: "This code is invalid or has no spots remaining.",
        });
      }

      // Beta is full — check consolation window
      const lastRedemptions = await db
        .select({ redeemed_at: betaRedemptions.redeemed_at })
        .from(betaRedemptions);

      if (lastRedemptions.length > 0) {
        lastRedemptionTime = Math.max(
          ...lastRedemptions.map((r) => r.redeemed_at.getTime())
        );
      }

      const withinWindow =
        lastRedemptionTime > 0 &&
        Date.now() - lastRedemptionTime < CONSOLATION_WINDOW_MS;

      if (!withinWindow) {
        return reply.status(410).send({
          error: "Beta Closed",
          message: "The beta program has ended. Sign up for a standard 14-day free trial instead.",
        });
      }

      // Can't stack with existing trial
      if (user.tier === "trial") {
        return reply.status(409).send({
          error: "Trial Active",
          message: "You already have an active trial.",
        });
      }

      // Activate 30-day extended trial
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + EXTENDED_TRIAL_DAYS);

      await db
        .update(users)
        .set({
          tier: "trial",
          trial_started_at: new Date(),
          beta_code: "EXTENDED_TRIAL",
          updated_at: new Date(),
        })
        .where(eq(users.id, userId));

      // Seed Shield rules for trial user
      seedShieldRules(userId).catch((err) =>
        logger.error("Failed to seed Shield rules: %s", (err as Error).message)
      );

      if (user.email) {
        sendConsolationEmail(user.email, trialEndsAt);
      }

      return reply.send({
        success: true,
        type: "extended_trial",
        tier: "trial",
        trial_days: EXTENDED_TRIAL_DAYS,
        trial_ends_at: trialEndsAt.toISOString(),
        message: `Beta is full, but we've activated a ${EXTENDED_TRIAL_DAYS}-day extended trial for you!`,
      });
    },
  });

  app.get("/api/beta/status", {
    preHandler: [authenticateAny],
    handler: async (request, reply) => {
      const db = getDb();
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, request.userId!));

      if (!user.beta_code) {
        return reply.send({ is_beta: false });
      }

      const now = new Date();
      const expired = user.beta_expires_at
        ? now > user.beta_expires_at
        : false;

      return reply.send({
        is_beta: true,
        beta_code: user.beta_code,
        beta_expires_at: user.beta_expires_at?.toISOString(),
        expired,
        days_remaining: user.beta_expires_at
          ? Math.max(
              0,
              Math.ceil(
                (user.beta_expires_at.getTime() - now.getTime()) /
                  (1000 * 60 * 60 * 24)
              )
            )
          : 0,
      });
    },
  });
}

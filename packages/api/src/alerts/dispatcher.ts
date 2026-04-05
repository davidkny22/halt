import { getDb } from "../db/client.js";
import { users, alerts, alertChannels } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { sendAlertEmail } from "./email.js";
import { sendTelegramAlert } from "./telegram.js";
import { sendDiscordAlert } from "./discord.js";
import { sendSmsAlert } from "./sms.js";
import { fireCustomWebhooks } from "./webhook.js";
import { TIER_FEATURES, type Tier } from "@halt/shared";
import { logger } from "../util/logger.js";

interface AlertData {
  alertId: string;
  userId: string;
  severity: string;
}

export async function dispatchAlert(data: AlertData): Promise<void> {
  const db = getDb();

  const [user] = await db.select().from(users).where(eq(users.id, data.userId));
  const [alert] = await db.select().from(alerts).where(eq(alerts.id, data.alertId));

  if (!user || !alert) return;

  const tier = user.tier as Tier;
  const features = TIER_FEATURES[tier];
  const deliveredChannels: string[] = [];

  const ruleName = (alert.context as any)?.rule_name || "Unknown rule";
  const triggerContext = (alert.context as any)?.trigger_context || "Condition met";

  const alertPayload = {
    severity: alert.severity,
    ruleName,
    triggerSummary: `halt just saved you. Your agent was blocked because: ${ruleName}. ${triggerContext}`,
    actionTaken: alert.severity === "critical" ? "Agent paused (kill switch)" : "Alert fired",
    dashboardUrl: "https://app.halt.dev/saves",
  };

  // Email (available to all tiers)
  if (features.alertChannels.includes("email")) {
    const sent = await sendAlertEmail(user.email, alertPayload);
    if (sent) deliveredChannels.push("email");
  }

  // Telegram, Discord, SMS — available on paid tiers
  if (features.alertChannels.includes("telegram") ||
      features.alertChannels.includes("discord") ||
      features.alertChannels.includes("sms")) {

    const channels = await db
      .select()
      .from(alertChannels)
      .where(eq(alertChannels.user_id, data.userId));

    for (const ch of channels) {
      if (!ch.enabled) continue;
      const config = ch.config as Record<string, string>;

      try {
        if (ch.channel === "telegram" && features.alertChannels.includes("telegram")) {
          if (config.botToken && config.chatId) {
            const sent = await sendTelegramAlert(config.botToken, config.chatId, alertPayload);
            if (sent) deliveredChannels.push("telegram");
          }
        }

        if (ch.channel === "discord" && features.alertChannels.includes("discord")) {
          if (config.webhookUrl) {
            const sent = await sendDiscordAlert(config.webhookUrl, alertPayload);
            if (sent) deliveredChannels.push("discord");
          }
        }

        if (ch.channel === "sms" && features.alertChannels.includes("sms")) {
          if (config.accountSid && config.authToken && config.from && config.to) {
            const sent = await sendSmsAlert(
              config.accountSid, config.authToken, config.from, config.to, alertPayload
            );
            if (sent) deliveredChannels.push("sms");
          }
        }
      } catch (err) {
        logger.error("Alert delivery failed for %s: %s", ch.channel, (err as Error).message);
      }
    }
  }

  // Custom webhooks (Enterprise)
  if (features.customWebhooks) {
    await fireCustomWebhooks(data.userId, `alert.${alert.severity}`, {
      event: `alert.${alert.severity}`,
      alert_id: alert.id,
      severity: alert.severity,
      message: alert.message,
      agent_id: alert.agent_id ?? undefined,
      timestamp: new Date().toISOString(),
    });
    deliveredChannels.push("webhook");
  }

  // Update alert with delivered channels
  await db
    .update(alerts)
    .set({ delivered_channels: deliveredChannels })
    .where(eq(alerts.id, data.alertId));
}

import { getDb } from "../db/client.js";
import { users, alerts } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { sendAlertEmail } from "./email.js";
import { TIER_FEATURES, type Tier } from "@clawnitor/shared";

interface AlertData {
  alertId: string;
  userId: string;
  severity: string;
}

export async function dispatchAlert(data: AlertData): Promise<void> {
  const db = getDb();

  // Load user and alert
  const [user] = await db.select().from(users).where(eq(users.id, data.userId));
  const [alert] = await db.select().from(alerts).where(eq(alerts.id, data.alertId));

  if (!user || !alert) return;

  const tier = user.tier as Tier;
  const features = TIER_FEATURES[tier];
  const deliveredChannels: string[] = [];

  // Email (available to all tiers)
  if (features.alertChannels.includes("email")) {
    const sent = await sendAlertEmail(user.email, {
      severity: alert.severity,
      ruleName: (alert.context as any)?.rule_name || "Unknown rule",
      triggerSummary: (alert.context as any)?.trigger_context || "Condition met",
      actionTaken: "Alert only",
      dashboardUrl: `https://clawnitor.io/dashboard`,
    });
    if (sent) deliveredChannels.push("email");
  }

  // Telegram, Discord, SMS — Phase 5

  // Update alert with delivered channels
  await db
    .update(alerts)
    .set({ delivered_channels: deliveredChannels })
    .where(eq(alerts.id, data.alertId));
}

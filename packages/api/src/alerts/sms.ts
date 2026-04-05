import twilio from "twilio";
import { logger } from "../util/logger.js";

interface SmsAlertData {
  severity: string;
  ruleName: string;
  triggerSummary: string;
  dashboardUrl: string;
}

export async function sendSmsAlert(
  accountSid: string,
  authToken: string,
  from: string,
  to: string,
  data: SmsAlertData
): Promise<boolean> {
  // SMS only for critical alerts
  if (data.severity !== "critical") return false;

  try {
    const client = twilio(accountSid, authToken);
    await client.messages.create({
      body: `🦞 Halt CRITICAL: ${data.ruleName} — ${data.triggerSummary}. Dashboard: ${data.dashboardUrl}`,
      from,
      to,
    });
    return true;
  } catch {
    logger.error("SMS alert failed");
    return false;
  }
}

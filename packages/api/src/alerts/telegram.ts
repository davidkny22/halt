import { logger } from "../util/logger.js";

interface TelegramAlertData {
  severity: string;
  agentName?: string;
  ruleName: string;
  triggerSummary: string;
  actionTaken: string;
  dashboardUrl: string;
}

export async function sendTelegramAlert(
  botToken: string,
  chatId: string,
  data: TelegramAlertData
): Promise<boolean> {
  const emoji = data.severity === "critical" ? "CRITICAL" : "ALERT";
  const text = [
    `🦞 halt ${emoji} [${data.severity.toUpperCase()}]`,
    `Agent: ${data.agentName || "Unknown"}`,
    `Rule: "${data.ruleName}"`,
    `Triggered: ${data.triggerSummary}`,
    `Action: ${data.actionTaken}`,
    `Dashboard: ${data.dashboardUrl}`,
  ].join("\n");

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
      }
    );
    return res.ok;
  } catch {
    logger.error("Telegram alert failed");
    return false;
  }
}

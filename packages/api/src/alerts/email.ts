import { Resend } from "resend";
import { getConfig } from "../config.js";
import { logger } from "../util/logger.js";

let _resend: Resend | undefined;

function getResend(): Resend | null {
  const config = getConfig();
  if (!config.RESEND_API_KEY) return null;
  if (!_resend) {
    _resend = new Resend(config.RESEND_API_KEY);
  }
  return _resend;
}

interface AlertEmailData {
  severity: string;
  agentName?: string;
  ruleName: string;
  triggerSummary: string;
  actionTaken: string;
  dashboardUrl: string;
}

export async function sendAlertEmail(
  to: string,
  data: AlertEmailData
): Promise<boolean> {
  const resend = getResend();
  if (!resend) {
    logger.warn("Resend not configured — skipping email alert");
    return false;
  }

  const severityLabel = data.severity.toUpperCase();
  const emoji = data.severity === "critical" ? "CRITICAL" : "ALERT";

  try {
    await resend.emails.send({
      from: "Clawnitor <alerts@clawnitor.io>",
      to,
      subject: `🦞 Clawnitor ${emoji} [${severityLabel}] — ${data.ruleName}`,
      text: [
        `🦞 Clawnitor Alert [${severityLabel}]`,
        `Agent: ${data.agentName || "Unknown"}`,
        `Rule: "${data.ruleName}"`,
        `Triggered: ${data.triggerSummary}`,
        `Action: ${data.actionTaken}`,
        `Dashboard: ${data.dashboardUrl}`,
      ].join("\n"),
    });
    return true;
  } catch (err) {
    logger.error("Failed to send alert email: %s", (err as Error).message);
    return false;
  }
}

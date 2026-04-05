interface DiscordAlertData {
  severity: string;
  agentName?: string;
  ruleName: string;
  triggerSummary: string;
  actionTaken: string;
  dashboardUrl: string;
}

const severityColors: Record<string, number> = {
  normal: 0x4ade80,
  elevated: 0xff6b4a,
  critical: 0xef4444,
};

export async function sendDiscordAlert(
  webhookUrl: string,
  data: DiscordAlertData
): Promise<boolean> {
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [
          {
            title: `🦞 Clawnitor Alert [${data.severity.toUpperCase()}]`,
            color: severityColors[data.severity] || severityColors.elevated,
            fields: [
              { name: "Agent", value: data.agentName || "Unknown", inline: true },
              { name: "Rule", value: data.ruleName, inline: true },
              { name: "Triggered", value: data.triggerSummary },
              { name: "Action", value: data.actionTaken },
            ],
            url: data.dashboardUrl,
          },
        ],
      }),
    });
    return res.ok;
  } catch {
    console.error("Discord alert failed");
    return false;
  }
}

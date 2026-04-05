import { createHmac } from "node:crypto";
import { getDb } from "../db/client.js";
import { customWebhooks } from "../db/schema.js";
import { eq, and } from "drizzle-orm";

// SSRF prevention — reject internal/private network URLs
function isInternalUrl(urlStr: string): boolean {
  try {
    const url = new URL(urlStr);
    const hostname = url.hostname.toLowerCase();

    // Block localhost
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname === "0.0.0.0") return true;

    // Block private IP ranges
    const parts = hostname.split(".").map(Number);
    if (parts.length === 4 && parts.every((p) => !isNaN(p))) {
      if (parts[0] === 10) return true; // 10.x.x.x
      if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true; // 172.16-31.x.x
      if (parts[0] === 192 && parts[1] === 168) return true; // 192.168.x.x
      if (parts[0] === 169 && parts[1] === 254) return true; // 169.254.x.x (link-local/metadata)
    }

    // Block common internal hostnames
    if (hostname.endsWith(".internal") || hostname.endsWith(".local") || hostname.endsWith(".railway.internal")) return true;

    // Block non-http(s) schemes
    if (url.protocol !== "https:" && url.protocol !== "http:") return true;

    return false;
  } catch {
    return true; // Invalid URLs are blocked
  }
}

export function validateWebhookUrl(url: string): { valid: boolean; reason?: string } {
  if (isInternalUrl(url)) {
    return { valid: false, reason: "Webhook URLs must not target internal or private networks." };
  }
  return { valid: true };
}

interface WebhookPayload {
  event: string;
  alert_id?: string;
  severity?: string;
  message: string;
  agent_id?: string;
  timestamp: string;
}

export async function fireCustomWebhooks(
  userId: string,
  eventType: string,
  payload: WebhookPayload
) {
  const db = getDb();

  const webhooks = await db
    .select()
    .from(customWebhooks)
    .where(and(eq(customWebhooks.user_id, userId), eq(customWebhooks.enabled, true)));

  for (const webhook of webhooks) {
    // Check if this webhook subscribes to this event type
    if (webhook.events && !webhook.events.includes(eventType) && !webhook.events.includes("*")) {
      continue;
    }

    try {
      const body = JSON.stringify(payload);
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "User-Agent": "Clawnitor-Webhook/1.0",
        "X-Clawnitor-Event": eventType,
      };

      // Sign the payload if webhook has a secret
      if (webhook.secret) {
        const signature = createHmac("sha256", webhook.secret)
          .update(body)
          .digest("hex");
        headers["X-Clawnitor-Signature"] = `sha256=${signature}`;
      }

      const res = await fetch(webhook.url, {
        method: "POST",
        headers,
        body,
        signal: AbortSignal.timeout(10_000),
      });

      // Update last triggered status
      await db
        .update(customWebhooks)
        .set({
          last_triggered_at: new Date(),
          last_status: res.status,
        })
        .where(eq(customWebhooks.id, webhook.id));
    } catch (err) {
      // Update with error status
      await db
        .update(customWebhooks)
        .set({
          last_triggered_at: new Date(),
          last_status: 0,
        })
        .where(eq(customWebhooks.id, webhook.id));

      console.error("Webhook delivery failed:", webhook.url, (err as Error).message);
    }
  }
}

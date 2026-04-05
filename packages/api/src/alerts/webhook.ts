/**
 * Custom webhook delivery (Enterprise feature).
 * Full implementation available in ee/packages/api/src/alerts/webhook.ts
 * with a valid halt Enterprise license.
 */

export async function fireCustomWebhooks(
  _userId: string,
  _eventType: string,
  _payload: Record<string, unknown>
): Promise<void> {
  // Enterprise feature — no-op in open-source build.
  // See ee/ directory for the full implementation.
}

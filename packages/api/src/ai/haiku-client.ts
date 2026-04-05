import Anthropic from "@anthropic-ai/sdk";
import { getConfig } from "../config.js";

let _client: Anthropic | undefined;
let _degraded = false;
let _consecutiveFailures = 0;
let _healthCheckTimer: ReturnType<typeof setInterval> | null = null;

const MAX_CONSECUTIVE_FAILURES = 3;
const HEALTH_CHECK_INTERVAL_MS = 60_000;
const TIMEOUT_MS = 30_000;

function getClient(): Anthropic | null {
  const config = getConfig();
  if (!config.ANTHROPIC_API_KEY) return null;
  if (!_client) {
    _client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });
  }
  return _client;
}

export function isDegraded(): boolean {
  return _degraded;
}

function markFailure() {
  _consecutiveFailures++;
  if (_consecutiveFailures >= MAX_CONSECUTIVE_FAILURES && !_degraded) {
    _degraded = true;
    console.warn("Haiku API marked as degraded after", _consecutiveFailures, "consecutive failures");

    // Start health check to recover
    if (!_healthCheckTimer) {
      _healthCheckTimer = setInterval(async () => {
        try {
          const client = getClient();
          if (!client) return;
          // Lightweight ping
          await client.messages.create({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 10,
            messages: [{ role: "user", content: "ping" }],
          });
          // Recovered
          _degraded = false;
          _consecutiveFailures = 0;
          if (_healthCheckTimer) {
            clearInterval(_healthCheckTimer);
            _healthCheckTimer = null;
          }
          console.info("Haiku API recovered from degraded state");
        } catch {
          // Still degraded
        }
      }, HEALTH_CHECK_INTERVAL_MS);
    }
  }
}

function markSuccess() {
  _consecutiveFailures = 0;
}

export async function evaluate(
  systemPrompt: string,
  userPrompt: string
): Promise<string | null> {
  if (_degraded) return null;

  const client = getClient();
  if (!client) return null;

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    markSuccess();

    const textBlock = response.content.find((b) => b.type === "text");
    return textBlock ? textBlock.text : null;
  } catch (err) {
    markFailure();
    console.error("Haiku API error:", (err as Error).message);
    return null;
  }
}

/**
 * AI client — provider-agnostic wrapper with automatic failover.
 *
 * Configure via env vars:
 *   AI_PROVIDER  = "gemini" | "openai" | "anthropic" | "groq" (default: "gemini")
 *   AI_FALLBACK  = fallback provider if primary is degraded (default: "openai")
 *   AI_MODEL     = override the default model for the chosen provider
 *
 * Defaults to Gemini 2.5 Flash-Lite as primary, GPT-4o-mini as fallback.
 * On 3 consecutive failures, automatically switches to fallback provider.
 * Health checks run every 60s to recover the primary when it comes back.
 */

import type { AIProvider, ProviderName } from "./provider.js";
import { AnthropicProvider } from "./providers/anthropic.js";
import { OpenAIProvider } from "./providers/openai.js";
import { GeminiProvider } from "./providers/gemini.js";
import { GroqProvider } from "./providers/groq.js";
import { logger } from "../util/logger.js";

let _primary: AIProvider | undefined;
let _fallback: AIProvider | undefined;
let _primaryDegraded = false;
let _allDegraded = false;
let _consecutiveFailures = 0;
let _healthCheckTimer: ReturnType<typeof setInterval> | null = null;

const MAX_CONSECUTIVE_FAILURES = 3;
const HEALTH_CHECK_INTERVAL_MS = 60_000;

function createProvider(name: ProviderName): AIProvider {
  switch (name) {
    case "anthropic":
      return new AnthropicProvider();
    case "openai":
      return new OpenAIProvider();
    case "gemini":
      return new GeminiProvider();
    case "groq":
      return new GroqProvider();
    default:
      throw new Error(`Unknown AI provider: ${name}`);
  }
}

function getPrimary(): AIProvider | null {
  if (_primary) return _primary;
  const name = (process.env.AI_PROVIDER || "gemini") as ProviderName;
  try {
    _primary = createProvider(name);
    logger.info("AI primary provider initialized: %s", _primary.name);
    return _primary;
  } catch {
    return null;
  }
}

function getFallback(): AIProvider | null {
  if (_fallback) return _fallback;
  const name = (process.env.AI_FALLBACK || "openai") as ProviderName;
  // Don't create fallback if it's the same as primary
  const primary = getPrimary();
  if (primary && primary.name === name) return null;
  try {
    _fallback = createProvider(name);
    logger.info("AI fallback provider initialized: %s", _fallback.name);
    return _fallback;
  } catch {
    return null;
  }
}

function getActiveProvider(): AIProvider | null {
  if (!_primaryDegraded) return getPrimary();
  return getFallback() ?? getPrimary();
}

export function isDegraded(): boolean {
  return _allDegraded;
}

export function getProviderName(): string {
  const active = getActiveProvider();
  return active?.name ?? "none";
}

export function shutdownAI() {
  if (_healthCheckTimer) {
    clearInterval(_healthCheckTimer);
    _healthCheckTimer = null;
  }
}

export function getProviderStatus(): {
  primary: string;
  fallback: string | null;
  active: string;
  primaryDegraded: boolean;
} {
  return {
    primary: getPrimary()?.name ?? "none",
    fallback: getFallback()?.name ?? null,
    active: getActiveProvider()?.name ?? "none",
    primaryDegraded: _primaryDegraded,
  };
}

function startHealthCheck() {
  if (_healthCheckTimer) return;
  _healthCheckTimer = setInterval(async () => {
    const primary = getPrimary();
    if (!primary || !_primaryDegraded) {
      if (_healthCheckTimer) {
        clearInterval(_healthCheckTimer);
        _healthCheckTimer = null;
      }
      return;
    }

    try {
      await primary.healthCheck();
      _primaryDegraded = false;
      _allDegraded = false;
      _consecutiveFailures = 0;
      if (_healthCheckTimer) {
        clearInterval(_healthCheckTimer);
        _healthCheckTimer = null;
      }
      logger.info("AI primary provider %s recovered", primary.name);
    } catch {
      // Primary still down
    }
  }, HEALTH_CHECK_INTERVAL_MS);
}

function markFailure(provider: AIProvider) {
  _consecutiveFailures++;
  if (_consecutiveFailures >= MAX_CONSECUTIVE_FAILURES && !_primaryDegraded) {
    _primaryDegraded = true;
    logger.warn(
      "AI primary provider %s degraded after %d failures, switching to fallback",
      provider.name,
      _consecutiveFailures
    );
    _consecutiveFailures = 0;
    startHealthCheck();
  }
  // If already on fallback and failing, mark everything degraded
  if (_primaryDegraded && _consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
    _allDegraded = true;
    logger.warn("AI fallback provider also degraded — all AI unavailable");
    startHealthCheck();
  }
}

function markSuccess() {
  _consecutiveFailures = 0;
  if (_allDegraded) {
    _allDegraded = false;
  }
}

export async function evaluate(
  systemPrompt: string,
  userPrompt: string
): Promise<string | null> {
  if (_allDegraded) return null;

  const provider = getActiveProvider();
  if (!provider) return null;

  try {
    const response = await provider.evaluate(systemPrompt, userPrompt);
    markSuccess();
    return response;
  } catch (err) {
    markFailure(provider);
    logger.error("AI provider error: %s %s", provider.name, (err as Error).message);

    // If we just switched to fallback, retry immediately on fallback
    if (_primaryDegraded && !_allDegraded) {
      const fallback = getActiveProvider();
      if (fallback && fallback !== provider) {
        try {
          const response = await fallback.evaluate(systemPrompt, userPrompt);
          markSuccess();
          logger.info("AI failover to %s succeeded", fallback.name);
          return response;
        } catch (fallbackErr) {
          markFailure(fallback);
          logger.error("AI fallback error: %s %s", fallback.name, (fallbackErr as Error).message);
        }
      }
    }

    return null;
  }
}

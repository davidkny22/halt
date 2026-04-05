/**
 * AI Provider abstraction layer.
 *
 * Swap models by setting AI_PROVIDER env var:
 *   "anthropic" | "openai" | "gemini" | "groq"
 *
 * Each provider implements the same interface: send a system + user prompt,
 * get back a string (expected JSON). All providers share the same
 * health/degradation logic.
 */

export interface AIProvider {
  readonly name: string;
  /** Send a prompt and return the text response */
  evaluate(systemPrompt: string, userPrompt: string): Promise<string>;
  /** Lightweight connectivity check */
  healthCheck(): Promise<void>;
}

export type ProviderName =
  | "anthropic"
  | "openai"
  | "gemini"
  | "groq";

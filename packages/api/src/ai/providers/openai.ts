import type { AIProvider } from "../provider.js";
import { getConfig } from "../../config.js";

/**
 * OpenAI provider — uses GPT-4o-mini by default.
 * Override model via AI_MODEL env var.
 *
 * Uses fetch directly against the chat completions endpoint
 * to avoid adding openai SDK as a dependency for this single call.
 */
export class OpenAIProvider implements AIProvider {
  readonly name = "openai";

  private get apiKey(): string {
    const key = getConfig().OPENAI_API_KEY;
    if (!key) throw new Error("OPENAI_API_KEY not set");
    return key;
  }

  private get model(): string {
    return process.env.AI_MODEL || "gpt-4o-mini";
  }

  async evaluate(systemPrompt: string, userPrompt: string): Promise<string> {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 500,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`OpenAI API ${res.status}: ${text}`);
    }

    const data = await res.json();
    return data.choices[0].message.content;
  }

  async healthCheck(): Promise<void> {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 5,
        messages: [{ role: "user", content: "ping" }],
      }),
    });
    if (!res.ok) throw new Error(`OpenAI health check failed: ${res.status}`);
  }
}

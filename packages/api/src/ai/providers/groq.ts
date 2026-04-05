import type { AIProvider } from "../provider.js";

/**
 * Groq provider — uses Llama 3.3 70B by default.
 * Override model via AI_MODEL env var.
 *
 * Groq uses the OpenAI-compatible API format.
 */
export class GroqProvider implements AIProvider {
  readonly name = "groq";

  private get apiKey(): string {
    const key = process.env.GROQ_API_KEY;
    if (!key) throw new Error("GROQ_API_KEY not set");
    return key;
  }

  private get model(): string {
    return process.env.AI_MODEL || "llama-3.3-70b-versatile";
  }

  async evaluate(systemPrompt: string, userPrompt: string): Promise<string> {
    const res = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
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
      }
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Groq API ${res.status}: ${text}`);
    }

    const data = await res.json();
    return data.choices[0].message.content;
  }

  async healthCheck(): Promise<void> {
    const res = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
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
      }
    );
    if (!res.ok) throw new Error(`Groq health check failed: ${res.status}`);
  }
}

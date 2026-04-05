import type { AIProvider } from "../provider.js";

/**
 * Google Gemini provider via Vertex AI (Express Mode).
 *
 * Uses Gemini 2.5 Flash-Lite by default, billed to GCP project
 * so $300 free credits apply.
 *
 * Auth: API key in GEMINI_API_KEY env var.
 * Override model via AI_MODEL env var.
 */
export class GeminiProvider implements AIProvider {
  readonly name = "gemini";

  private get apiKey(): string {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY not set");
    return key;
  }

  private get model(): string {
    return process.env.AI_MODEL || "gemini-2.5-flash-lite";
  }

  async evaluate(systemPrompt: string, userPrompt: string): Promise<string> {
    const url = `https://aiplatform.googleapis.com/v1/publishers/google/models/${this.model}:generateContent?key=${this.apiKey}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userPrompt }] }],
        generationConfig: {
          maxOutputTokens: 500,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Gemini API ${res.status}: ${text}`);
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Gemini returned empty or filtered response");
    return text;
  }

  async healthCheck(): Promise<void> {
    const url = `https://aiplatform.googleapis.com/v1/publishers/google/models/${this.model}:generateContent?key=${this.apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "ping" }] }],
        generationConfig: { maxOutputTokens: 5 },
      }),
    });
    if (!res.ok) throw new Error(`Gemini health check failed: ${res.status}`);
  }
}

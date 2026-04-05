import Anthropic from "@anthropic-ai/sdk";
import type { AIProvider } from "../provider.js";
import { getConfig } from "../../config.js";

export class AnthropicProvider implements AIProvider {
  readonly name = "anthropic";
  private client: Anthropic | null = null;

  private getClient(): Anthropic | null {
    if (this.client) return this.client;
    const key = getConfig().ANTHROPIC_API_KEY;
    if (!key) return null;
    this.client = new Anthropic({ apiKey: key });
    return this.client;
  }

  async evaluate(systemPrompt: string, userPrompt: string): Promise<string> {
    const client = this.getClient();
    if (!client) throw new Error("ANTHROPIC_API_KEY not set");

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock) throw new Error("No text in Anthropic response");
    return textBlock.text;
  }

  async healthCheck(): Promise<void> {
    const client = this.getClient();
    if (!client) throw new Error("ANTHROPIC_API_KEY not set");
    await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 10,
      messages: [{ role: "user", content: "ping" }],
    });
  }
}

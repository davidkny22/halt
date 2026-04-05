import {
  DEFAULT_SPEND_LIMIT,
  DEFAULT_RATE_LIMIT,
} from "@clawnitor/shared";

export interface PluginConfig {
  apiKey: string;
  backendUrl: string;
  spendLimit: number;
  rateLimit: number;
  toolBlocklist: string[];
  redactionPatterns: string[];
}

export function parseConfig(raw: Record<string, unknown>): PluginConfig {
  const apiKey = raw.apiKey as string;
  if (!apiKey) {
    throw new Error("Clawnitor: apiKey is required. Sign up at https://clawnitor.io");
  }

  return {
    apiKey,
    backendUrl: (raw.backendUrl as string) || "https://api.clawnitor.io",
    spendLimit: (raw.spendLimit as number) ?? DEFAULT_SPEND_LIMIT,
    rateLimit: (raw.rateLimit as number) ?? DEFAULT_RATE_LIMIT,
    toolBlocklist: (raw.toolBlocklist as string[]) ?? [],
    redactionPatterns: (raw.redactionPatterns as string[]) ?? [],
  };
}

import {
  DEFAULT_SPEND_LIMIT,
  DEFAULT_RATE_LIMIT,
} from "@halt/shared";
import type { CachedRule } from "./rule-cache.js";
import type { ShieldConfig } from "./shield/scanner.js";

export interface PluginConfig {
  apiKey: string;
  backendUrl: string;
  spendLimit: number;
  rateLimit: number;
  toolBlocklist: string[];
  redactionPatterns: string[];
  offlineMode: boolean;
  offlineRules: CachedRule[];
  offlineShieldConfig: ShieldConfig | null;
}

export function parseConfig(raw: Record<string, unknown>): PluginConfig {
  const offlineMode = raw.offlineMode === true;
  const apiKey = raw.apiKey as string;

  if (!offlineMode && !apiKey) {
    throw new Error("Halt: apiKey is required. Sign up at https://halt.dev or set offlineMode: true for local-only mode.");
  }

  // Parse inline rules for offline mode
  const rawRules = raw.rules as any[] | undefined;
  const offlineRules: CachedRule[] = (rawRules || []).map((r: any) => ({
    id: r.id || `rule-${Math.random().toString(36).slice(2, 8)}`,
    name: r.name || "Unnamed rule",
    rule_type: r.rule_type || "keyword",
    config: r.config || {},
    enabled: r.enabled !== false,
    action_mode: r.action_mode || "block",
    agent_visible: r.agent_visible,
    agent_ids: r.agent_ids || null,
  }));

  // Parse inline Shield config for offline mode
  const rawShield = raw.shieldConfig as any | undefined;
  const offlineShieldConfig: ShieldConfig | null = rawShield ? {
    enabledCategories: rawShield.enabledCategories,
    actionModes: rawShield.actionModes,
    allowlist: rawShield.allowlist,
    scanOutputs: rawShield.scanOutputs,
  } : null;

  return {
    apiKey: apiKey || "",
    backendUrl: (raw.backendUrl as string) || "https://api.halt.dev",
    spendLimit: (raw.spendLimit as number) ?? DEFAULT_SPEND_LIMIT,
    rateLimit: (raw.rateLimit as number) ?? DEFAULT_RATE_LIMIT,
    toolBlocklist: (raw.toolBlocklist as string[]) ?? [],
    redactionPatterns: (raw.redactionPatterns as string[]) ?? [],
    offlineMode,
    offlineRules,
    offlineShieldConfig,
  };
}

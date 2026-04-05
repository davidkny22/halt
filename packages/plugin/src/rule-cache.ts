import type { PluginConfig } from "./config.js";
import type { ShieldConfig } from "./shield/scanner.js";

export interface CachedRule {
  id: string;
  name: string;
  rule_type: string;
  config: any;
  enabled: boolean;
  action_mode?: string; // "block" | "alert" | "both"
  agent_visible?: boolean;
}

interface RuleCheckResult {
  blocked: boolean;
  ruleName?: string;
  reason?: string;
}

// Tracks recent events for time-window based rules
interface EventRecord {
  timestamp: number;
  toolName?: string;
  eventType?: string;
  costUsd?: number;
  action?: string;
  target?: string;
  rawSnippet?: string;
}

export class RuleCache {
  private rules: CachedRule[] = [];
  private config: PluginConfig;
  private fetchTimer: ReturnType<typeof setInterval> | null = null;
  private recentEvents: EventRecord[] = [];
  private readonly MAX_RECENT_EVENTS = 500;
  private cachedShieldConfig: ShieldConfig | null = null;
  private getAgentId?: () => string;
  private ruleVisibility: string = "per_rule"; // "all_visible" | "per_rule" | "all_silent"

  constructor(config: PluginConfig, getAgentId?: () => string) {
    this.config = config;
    this.getAgentId = getAgentId;
  }

  start() {
    // Fetch immediately, then every 60s
    this.fetchRules();
    this.fetchTimer = setInterval(() => this.fetchRules(), 60_000);
  }

  stop() {
    if (this.fetchTimer) {
      clearInterval(this.fetchTimer);
      this.fetchTimer = null;
    }
  }

  private async fetchRules() {
    try {
      let url = `${this.config.backendUrl}/api/rules`;
      const agentId = this.getAgentId?.();
      if (agentId && agentId !== "unknown") {
        url += `?agent_id=${encodeURIComponent(agentId)}`;
      }
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = await res.json();
        this.rules = (data.rules || []).filter((r: CachedRule) => r.enabled);
        this.ruleVisibility = data.rule_visibility || "per_rule";
        this.cachedShieldConfig = null; // Rebuild on next getShieldConfig()
      }
    } catch {
      // Keep existing cached rules on fetch failure
    }
  }

  recordEvent(event: EventRecord) {
    this.recentEvents.push(event);
    // Trim to max size
    if (this.recentEvents.length > this.MAX_RECENT_EVENTS) {
      this.recentEvents = this.recentEvents.slice(-this.MAX_RECENT_EVENTS);
    }
  }

  // Evaluate all cached pattern rules against the current tool call + recent history
  checkBeforeToolCall(
    toolName: string,
    params?: Record<string, unknown>
  ): RuleCheckResult {
    const paramsStr = params ? JSON.stringify(params).slice(0, 500) : "";

    // Skip rule evaluation for tool calls that target the Clawnitor backend itself
    // (e.g., curl commands creating rules with keywords in the config)
    if (paramsStr.includes("api.clawnitor.io") || paramsStr.includes("/api/rules")) {
      return { blocked: false };
    }

    for (const rule of this.rules) {
      if (rule.rule_type === "nl") continue; // Can't evaluate locally
      if (rule.rule_type === "injection") continue; // Handled by Shield scanner
      if (rule.action_mode === "alert") continue; // Alert-only rules don't block

      const result = this.evaluateRule(rule, toolName, paramsStr);
      if (result.blocked) {
        return result;
      }
    }

    return { blocked: false };
  }

  private evaluateRule(
    rule: CachedRule,
    toolName: string,
    paramsStr: string
  ): RuleCheckResult {
    const config = rule.config;

    if (rule.rule_type === "keyword") {
      return this.evaluateKeyword(rule, toolName, paramsStr);
    }

    if (rule.rule_type === "rate") {
      return this.evaluateRate(rule);
    }

    if (rule.rule_type === "threshold") {
      return this.evaluateThreshold(rule);
    }

    return { blocked: false };
  }

  private evaluateKeyword(
    rule: CachedRule,
    toolName: string,
    paramsStr: string
  ): RuleCheckResult {
    const config = rule.config;
    const keywords: string[] = config.keywords || [];
    const caseSensitive = config.caseSensitive || false;
    const matchMode = config.matchMode || "any";

    const searchable = [toolName, paramsStr].join(" ");
    const text = caseSensitive ? searchable : searchable.toLowerCase();

    const matched = keywords.filter((kw) => {
      const k = caseSensitive ? kw : kw.toLowerCase();
      return text.includes(k);
    });

    const triggered =
      matchMode === "any" ? matched.length > 0 : matched.length === keywords.length;

    if (triggered) {
      return {
        blocked: true,
        ruleName: rule.name,
        reason: `Clawnitor: Rule "${rule.name}" blocked — keyword match: ${matched.join(", ")}`,
      };
    }

    return { blocked: false };
  }

  private evaluateRate(rule: CachedRule): RuleCheckResult {
    const config = rule.config;
    const windowMs = (config.windowMinutes || 10) * 60 * 1000;
    const maxCount = config.maxCount || 100;
    const now = Date.now();

    let filtered = this.recentEvents.filter(
      (e) => e.timestamp > now - windowMs
    );

    if (config.eventType) {
      filtered = filtered.filter((e) => e.eventType === config.eventType);
    }
    if (config.toolName) {
      filtered = filtered.filter((e) => e.toolName === config.toolName);
    }

    if (filtered.length >= maxCount) {
      return {
        blocked: true,
        ruleName: rule.name,
        reason: `Clawnitor: Rule "${rule.name}" blocked — ${filtered.length} events in ${config.windowMinutes}min (max: ${maxCount})`,
      };
    }

    return { blocked: false };
  }

  private evaluateThreshold(rule: CachedRule): RuleCheckResult {
    const config = rule.config;
    const windowMs = (config.windowMinutes || 60) * 60 * 1000;
    const now = Date.now();

    const recentInWindow = this.recentEvents.filter(
      (e) => e.timestamp > now - windowMs
    );

    let sum = 0;
    for (const event of recentInWindow) {
      if (config.field === "cost_usd" && event.costUsd) {
        sum += event.costUsd;
      }
    }

    const triggered =
      config.operator === "gt" ? sum > config.value : sum < config.value;

    if (triggered) {
      return {
        blocked: true,
        ruleName: rule.name,
        reason: `Clawnitor: Rule "${rule.name}" blocked — ${config.field} = ${sum.toFixed(4)} (${config.operator} ${config.value})`,
      };
    }

    return { blocked: false };
  }

  getRuleCount(): number {
    return this.rules.length;
  }

  getVisibleRulesContext(): string | null {
    if (this.ruleVisibility === "all_silent") return null;

    const visible = this.ruleVisibility === "all_visible"
      ? this.rules
      : this.rules.filter((r) => r.agent_visible !== false);
    if (visible.length === 0) return null;

    const lines = ["# Clawnitor — Active Monitoring Rules", ""];
    lines.push("The following rules are enforced by Clawnitor. Violating a rule may result in your action being blocked, an alert being sent to the user, or your session being terminated.");
    lines.push("");

    for (const rule of visible) {
      const action = rule.action_mode === "block" ? "blocks the action"
        : rule.action_mode === "alert" ? "alerts the user"
        : "blocks the action and alerts the user";
      lines.push(`- **${rule.name}** (${rule.rule_type}) — ${action}`);
    }

    return lines.join("\n");
  }

  getShieldConfig(): ShieldConfig {
    if (this.cachedShieldConfig) return this.cachedShieldConfig;
    return this.buildShieldConfig();
  }

  private buildShieldConfig(): ShieldConfig {
    const defaults: ShieldConfig = {
      enabledCategories: [
        "destructive_commands", "credential_exfiltration",
        "instruction_overrides", "system_prompt_manipulation",
        "encoding_obfuscation", "data_exfiltration",
      ],
      actionModes: { critical: "block", high: "block", medium: "alert" },
      allowlist: [],
      scanOutputs: true,
    };

    const shieldRules = this.rules.filter((r) => r.rule_type === "injection");
    if (shieldRules.length === 0) return defaults;

    const actionModes = { ...defaults.actionModes };
    const enabledCategories = new Set<string>();
    const allowlist = new Set<string>();
    let scanOutputs = true;

    for (const rule of shieldRules) {
      if (!rule.enabled) continue;
      const config = rule.config as any;
      const tier = config?.shield_tier;
      if (tier && rule.action_mode) {
        actionModes[tier as keyof typeof actionModes] =
          rule.action_mode === "both" ? "block" : (rule.action_mode as "block" | "alert");
      }
      if (config?.categories) {
        for (const cat of config.categories) enabledCategories.add(cat);
      }
      if (config?.allowlist) {
        for (const tool of config.allowlist) allowlist.add(tool);
      }
      if (config?.scan_outputs === false) scanOutputs = false;
    }

    this.cachedShieldConfig = {
      enabledCategories: enabledCategories.size > 0 ? [...enabledCategories] : defaults.enabledCategories,
      actionModes,
      allowlist: [...allowlist],
      scanOutputs,
    };

    return this.cachedShieldConfig;
  }
}

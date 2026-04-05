import type { PluginConfig } from "./config.js";
import type { ShieldConfig } from "./shield/scanner.js";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

export interface CachedRule {
  id: string;
  name: string;
  rule_type: string;
  config: any;
  enabled: boolean;
  action_mode?: string; // "block" | "alert" | "both"
  agent_visible?: boolean;
  agent_ids?: string[] | null; // null = all agents
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
  private recentEventsByAgent = new Map<string, EventRecord[]>();
  private readonly MAX_RECENT_EVENTS = 500;
  private cachedShieldConfig: ShieldConfig | null = null;
  private ruleVisibility: string = "per_rule";
  private autoKillConfigs: Record<string, { enabled: boolean; threshold: number; windowMinutes: number }> = {};

  constructor(config: PluginConfig) {
    this.config = config;
  }

  start() {
    if (this.config.offlineMode) {
      this.loadOfflineRules();
      // Re-read ~/.halt/rules.json every 30s so dashboard changes take effect
      this.fetchTimer = setInterval(() => this.loadOfflineRules(), 30_000);
      return;
    }
    // Online: fetch immediately, then every 60s
    this.fetchRules();
    this.fetchTimer = setInterval(() => this.fetchRules(), 60_000);
  }

  private loadOfflineRules() {
    // Priority: ~/.halt/rules.json (shared with local dashboard), then inline config
    const sharedPath = join(homedir(), ".halt", "rules.json");
    let fileRules: CachedRule[] = [];
    try {
      if (existsSync(sharedPath)) {
        const raw = readFileSync(sharedPath, "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) fileRules = parsed;
      }
    } catch {
      // File read failed — fall back to inline
    }

    // Merge: file rules take precedence, then inline config rules
    const allRules = fileRules.length > 0
      ? [...fileRules, ...this.config.offlineRules.filter((ir) => !fileRules.some((fr) => fr.id === ir.id))]
      : this.config.offlineRules;

    this.rules = allRules.filter((r) => r.enabled);

    if (this.config.offlineShieldConfig) {
      this.cachedShieldConfig = this.config.offlineShieldConfig;
    }
  }

  stop() {
    if (this.fetchTimer) {
      clearInterval(this.fetchTimer);
      this.fetchTimer = null;
    }
  }

  private async fetchRules() {
    try {
      // Fetch ALL rules (no agent filter) — filter per-agent at evaluation time
      const url = `${this.config.backendUrl}/api/rules`;
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
        this.autoKillConfigs = data.auto_kill_configs || {};
        this.cachedShieldConfig = null; // Rebuild on next getShieldConfig()
      }
    } catch {
      // Keep existing cached rules on fetch failure
    }
  }

  recordEvent(event: EventRecord, agentId?: string) {
    const key = agentId || "_global";
    let events = this.recentEventsByAgent.get(key);
    if (!events) {
      events = [];
      this.recentEventsByAgent.set(key, events);
    }
    events.push(event);
    if (events.length > this.MAX_RECENT_EVENTS) {
      this.recentEventsByAgent.set(key, events.slice(-this.MAX_RECENT_EVENTS));
    }
  }

  private getRecentEvents(agentId?: string): EventRecord[] {
    return this.recentEventsByAgent.get(agentId || "_global") || [];
  }

  // Evaluate cached pattern rules against the current tool call (per-agent filtered)
  checkBeforeToolCall(
    toolName: string,
    params?: Record<string, unknown>,
    agentId?: string
  ): RuleCheckResult {
    const paramsStr = params ? JSON.stringify(params).slice(0, 500) : "";

    if (toolName === "fetch" && paramsStr.includes("api.halt.dev")) {
      return { blocked: false };
    }

    const applicableRules = agentId ? this.rulesForAgent(agentId) : this.rules;

    for (const rule of applicableRules) {
      if (rule.rule_type === "nl") continue; // Can't evaluate locally
      if (rule.rule_type === "injection") continue; // Handled by Shield scanner
      if (rule.action_mode === "alert") continue; // Alert-only rules don't block

      const result = this.evaluateRule(rule, toolName, paramsStr, agentId);
      if (result.blocked) {
        return result;
      }
    }

    return { blocked: false };
  }

  private evaluateRule(
    rule: CachedRule,
    toolName: string,
    paramsStr: string,
    agentId?: string
  ): RuleCheckResult {
    const config = rule.config;

    if (rule.rule_type === "keyword") {
      return this.evaluateKeyword(rule, toolName, paramsStr);
    }

    if (rule.rule_type === "rate") {
      return this.evaluateRate(rule, agentId);
    }

    if (rule.rule_type === "threshold") {
      return this.evaluateThreshold(rule, agentId);
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
        reason: `halt: Rule "${rule.name}" blocked — keyword match: ${matched.join(", ")}`,
      };
    }

    return { blocked: false };
  }

  private evaluateRate(rule: CachedRule, agentId?: string): RuleCheckResult {
    const config = rule.config;
    const windowMs = (config.windowMinutes || 10) * 60 * 1000;
    const maxCount = config.maxCount || 100;
    const now = Date.now();

    let filtered = this.getRecentEvents(agentId).filter(
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
        reason: `halt: Rule "${rule.name}" blocked — ${filtered.length} events in ${config.windowMinutes}min (max: ${maxCount})`,
      };
    }

    return { blocked: false };
  }

  private evaluateThreshold(rule: CachedRule, agentId?: string): RuleCheckResult {
    const config = rule.config;
    const windowMs = (config.windowMinutes || 60) * 60 * 1000;
    const now = Date.now();

    const recentInWindow = this.getRecentEvents(agentId).filter(
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
        reason: `halt: Rule "${rule.name}" blocked — ${config.field} = ${sum.toFixed(4)} (${config.operator} ${config.value})`,
      };
    }

    return { blocked: false };
  }

  getRuleCount(): number {
    return this.rules.length;
  }

  getAutoKillConfig(agentId?: string): { enabled: boolean; threshold: number; windowMinutes: number } {
    // Online mode: use server-provided configs
    if (agentId && this.autoKillConfigs[agentId]) {
      return this.autoKillConfigs[agentId];
    }
    // Offline mode: check ~/.halt/agents.json
    if (this.config.offlineMode && agentId) {
      try {
        const agentsPath = join(homedir(), ".halt", "agents.json");
        if (existsSync(agentsPath)) {
          const configs = JSON.parse(readFileSync(agentsPath, "utf-8"));
          if (configs[agentId]) {
            return {
              enabled: configs[agentId].auto_kill_enabled ?? true,
              threshold: configs[agentId].auto_kill_threshold ?? 3,
              windowMinutes: configs[agentId].auto_kill_window_minutes ?? 10,
            };
          }
        }
      } catch {
        // Fall through to default
      }
    }
    return { enabled: true, threshold: 3, windowMinutes: 10 };
  }

  // Filter rules applicable to a specific agent
  private rulesForAgent(agentId?: string): CachedRule[] {
    if (!agentId) return this.rules;
    return this.rules.filter((r) =>
      !r.agent_ids || r.agent_ids.length === 0 || r.agent_ids.includes(agentId)
    );
  }

  getVisibleRulesContext(): string | null {
    return this.getVisibleRulesContextForAgent(undefined);
  }

  getVisibleRulesContextForAgent(agentId?: string): string | null {
    if (this.ruleVisibility === "all_silent") return null;

    const agentRules = this.rulesForAgent(agentId);
    const visible = this.ruleVisibility === "all_visible"
      ? agentRules
      : agentRules.filter((r) => r.agent_visible !== false);
    if (visible.length === 0) return null;

    const lines = ["# halt — Active Monitoring Rules", ""];
    lines.push("The following rules are enforced by halt. Violating a rule may result in your action being blocked, an alert being sent to the user, or your session being terminated.");
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

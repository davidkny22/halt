import type { PluginConfig } from "./config.js";

export interface CachedRule {
  id: string;
  name: string;
  rule_type: string;
  config: any;
  enabled: boolean;
  action_mode?: string; // "block" | "alert" | "both"
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

  constructor(config: PluginConfig) {
    this.config = config;
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
      const res = await fetch(`${this.config.backendUrl}/api/rules`, {
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = await res.json();
        this.rules = (data.rules || []).filter((r: CachedRule) => r.enabled);
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
}

export interface ViolationEntry {
  ruleId: string;
  ruleName: string;
  timestamp: number;
  action: string;
  target: string;
}

export interface AutoKillConfig {
  enabled: boolean;
  threshold: number; // default: 3
  windowMinutes: number; // default: 10
}

export interface AutoKillResult {
  shouldKill: boolean;
  violations: ViolationEntry[];
  message: string;
}

export class ViolationTracker {
  private violations: ViolationEntry[] = [];
  private config: AutoKillConfig;

  constructor(config?: Partial<AutoKillConfig>) {
    this.config = {
      enabled: config?.enabled ?? true,
      threshold: config?.threshold ?? 3,
      windowMinutes: config?.windowMinutes ?? 10,
    };
  }

  updateConfig(config: Partial<AutoKillConfig>) {
    if (config.enabled !== undefined) this.config.enabled = config.enabled;
    if (config.threshold !== undefined) this.config.threshold = config.threshold;
    if (config.windowMinutes !== undefined)
      this.config.windowMinutes = config.windowMinutes;
  }

  recordViolation(entry: ViolationEntry): AutoKillResult {
    if (!this.config.enabled) {
      return { shouldKill: false, violations: [], message: "" };
    }

    this.violations.push(entry);
    this.prune();

    const windowMs = this.config.windowMinutes * 60_000;
    const cutoff = Date.now() - windowMs;
    const inWindow = this.violations.filter((v) => v.timestamp > cutoff);

    if (inWindow.length >= this.config.threshold) {
      const message = `Auto-killed: ${inWindow.length} violations in ${this.config.windowMinutes} minutes (threshold: ${this.config.threshold})`;
      return { shouldKill: true, violations: [...inWindow], message };
    }

    return { shouldKill: false, violations: [], message: "" };
  }

  getViolationCount(): number {
    this.prune();
    const windowMs = this.config.windowMinutes * 60_000;
    const cutoff = Date.now() - windowMs;
    return this.violations.filter((v) => v.timestamp > cutoff).length;
  }

  getConfig(): Readonly<AutoKillConfig> {
    return { ...this.config };
  }

  reset() {
    this.violations = [];
  }

  private prune() {
    // Keep only violations within 2x the window (generous buffer)
    const maxAge = this.config.windowMinutes * 2 * 60_000;
    const cutoff = Date.now() - maxAge;
    this.violations = this.violations.filter((v) => v.timestamp > cutoff);
  }
}

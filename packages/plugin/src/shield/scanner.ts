/**
 * Shield — Scanner Engine
 *
 * Main entry point for input/output injection scanning.
 * Combines fast-path string scan with deep object traversal.
 */

import {
  SHIELD_PATTERNS,
  type ShieldPattern,
  type ShieldDetection,
  type ShieldTier,
} from "./patterns.js";
import { deepScan } from "./deep-scan.js";

export interface ShieldConfig {
  enabledCategories: string[];
  actionModes: Record<ShieldTier, "block" | "alert">;
  allowlist: string[];
  scanOutputs: boolean;
}

export interface ShieldResult {
  detected: boolean;
  detections: ShieldDetection[];
  highestSeverity: ShieldTier | null;
  shouldBlock: boolean;
}

const TIER_PRIORITY: Record<ShieldTier, number> = {
  critical: 3,
  high: 2,
  medium: 1,
};

const DEFAULT_CONFIG: ShieldConfig = {
  enabledCategories: [
    "destructive_commands",
    "credential_exfiltration",
    "instruction_overrides",
    "system_prompt_manipulation",
    "encoding_obfuscation",
    "data_exfiltration",
  ],
  actionModes: { critical: "block", high: "block", medium: "alert" },
  allowlist: [],
  scanOutputs: true,
};

const EMPTY_RESULT: ShieldResult = {
  detected: false,
  detections: [],
  highestSeverity: null,
  shouldBlock: false,
};

export class ShieldScanner {
  private config: ShieldConfig;
  private inputPatterns: ShieldPattern[];
  private outputPatterns: ShieldPattern[];

  constructor(config?: Partial<ShieldConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.inputPatterns = this.buildPatternSet(false);
    this.outputPatterns = this.buildPatternSet(true);
  }

  updateConfig(config: Partial<ShieldConfig>): void {
    this.config = { ...this.config, ...config };
    this.inputPatterns = this.buildPatternSet(false);
    this.outputPatterns = this.buildPatternSet(true);
  }

  private buildPatternSet(includeOutputOnly: boolean): ShieldPattern[] {
    return SHIELD_PATTERNS.filter((p) => {
      if (!this.config.enabledCategories.includes(p.category)) return false;
      if (!includeOutputOnly && p.outputOnly) return false;
      return true;
    });
  }

  /**
   * Scan tool inputs before execution.
   * Returns detections with block/alert recommendation.
   */
  scanInput(
    toolName: string,
    params?: Record<string, unknown>
  ): ShieldResult {
    // Allowlist check
    if (this.config.allowlist.includes(toolName)) {
      return EMPTY_RESULT;
    }

    // Self-targeting skip — don't scan Clawnitor's own API calls
    const paramsStr = params ? JSON.stringify(params).slice(0, 2000) : "";
    if (
      paramsStr.includes("api.clawnitor.io") ||
      paramsStr.includes("/api/rules")
    ) {
      return EMPTY_RESULT;
    }

    // Fast-path: scan the serialized string directly
    const searchable = `${toolName} ${paramsStr}`;
    let detections = this.scanString(searchable, this.inputPatterns);

    // Deep scan if fast-path found nothing and params is a complex object
    if (detections.length === 0 && params && typeof params === "object") {
      detections = deepScan(params, this.inputPatterns, { isOutput: false });
    }

    return this.buildResult(detections);
  }

  /**
   * Scan tool outputs after execution.
   * Catches indirect injection (RAG poisoning, API response poisoning).
   */
  scanOutput(toolName: string, result: unknown): ShieldResult {
    if (!this.config.scanOutputs) return EMPTY_RESULT;

    // Allowlist check
    if (this.config.allowlist.includes(toolName)) {
      return EMPTY_RESULT;
    }

    // Deep scan the result — it could be a string, object, or anything
    const detections = deepScan(result, this.outputPatterns, {
      isOutput: true,
    });

    return this.buildResult(detections);
  }

  private scanString(
    text: string,
    patterns: ShieldPattern[]
  ): ShieldDetection[] {
    const normalized = text.normalize("NFKC");
    const detections: ShieldDetection[] = [];

    for (const pattern of patterns) {
      if (pattern.pattern.test(normalized)) {
        const match = normalized.match(pattern.pattern);
        detections.push({
          patternName: pattern.name,
          category: pattern.category,
          severity: pattern.severity,
          matched: match ? match[0].slice(0, 100) : "(pattern matched)",
          description: pattern.description,
        });
      }
    }

    return detections;
  }

  private buildResult(detections: ShieldDetection[]): ShieldResult {
    if (detections.length === 0) return EMPTY_RESULT;

    // Find highest severity
    let highest: ShieldTier = "medium";
    for (const d of detections) {
      if (TIER_PRIORITY[d.severity] > TIER_PRIORITY[highest]) {
        highest = d.severity;
      }
    }

    // Determine if we should block based on action mode
    const actionMode = this.config.actionModes[highest];
    const shouldBlock = actionMode === "block";

    return {
      detected: true,
      detections,
      highestSeverity: highest,
      shouldBlock,
    };
  }
}

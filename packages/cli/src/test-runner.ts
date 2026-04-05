/**
 * Test runner — orchestrates curated suite + rule-specific tests,
 * scores results, formats output.
 */

import { CURATED_SUITE, ATTACK_COUNT, BENIGN_COUNT, type TestCase } from "./test-suite.js";
import { generateRuleTests } from "./rule-generator.js";
import { createScanner, loadPatterns, type ScanResult } from "./scanner-lite.js";

interface TestResult {
  name: string;
  passed: boolean;
  detected: boolean;
  expected: boolean;
  severity?: string;
  category?: string;
  patterns?: string[];
}

interface CategoryResult {
  category: string;
  severity: string;
  detected: number;
  total: number;
  rate: number;
}

interface RuleTestResult {
  ruleName: string;
  caught: number;
  total: number;
  passed: boolean;
  missed: string[];
}

type RiskLevel = "SAFE" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
type DeployRecommendation = "PASS" | "WARN" | "BLOCK";

interface ScoreResult {
  reliability: number;
  risk: RiskLevel;
  deploy: DeployRecommendation;
  confidence: number;
  totalTests: number;
  truePositives: number;
  trueNegatives: number;
  falsePositives: number;
  falseNegatives: number;
  categories: CategoryResult[];
  ruleResults: RuleTestResult[];
  gaps: string[];
  allResults: TestResult[];
}

function getRisk(reliability: number): RiskLevel {
  if (reliability >= 0.95) return "SAFE";
  if (reliability >= 0.85) return "LOW";
  if (reliability >= 0.70) return "MEDIUM";
  if (reliability >= 0.50) return "HIGH";
  return "CRITICAL";
}

function getDeploy(risk: RiskLevel): DeployRecommendation {
  if (risk === "SAFE" || risk === "LOW") return "PASS";
  if (risk === "MEDIUM") return "WARN";
  return "BLOCK";
}

export async function runTests(rules?: any[]): Promise<ScoreResult> {
  const patterns = await loadPatterns();
  const scanner = createScanner(patterns);
  const allResults: TestResult[] = [];
  const gaps: string[] = [];

  // Run curated suite
  for (const tc of CURATED_SUITE) {
    const result = scanner.scanInput(tc.toolName, tc.params);

    // For data_exfiltration tests (output-only patterns), also scan as output
    const outputResult = tc.expectedCategory === "data_exfiltration"
      ? scanner.scanOutput(tc.toolName, tc.params)
      : { detected: false, detections: [], highestSeverity: null } as ScanResult;

    const detected = result.detected || outputResult.detected;
    const passed = detected === tc.expectedDetect;

    allResults.push({
      name: tc.name,
      passed,
      detected,
      expected: tc.expectedDetect,
      severity: result.highestSeverity || outputResult.highestSeverity || undefined,
      category: result.detections[0]?.category || outputResult.detections[0]?.category,
      patterns: [...result.detections, ...outputResult.detections].map(d => d.patternName),
    });

    if (!passed && tc.expectedDetect) {
      gaps.push(`${tc.expectedSeverity || "unknown"}: "${tc.name}" not detected — expected ${tc.expectedCategory || "detection"}`);
    }
  }

  // Run rule-specific tests
  const ruleResults: RuleTestResult[] = [];
  if (rules && rules.length > 0) {
    const ruleTests = generateRuleTests(rules);
    for (const tc of ruleTests) {
      const result = scanner.scanInput(tc.toolName, tc.params);
      const detected = result.detected;
      const passed = detected === tc.expectedDetect;

      allResults.push({
        name: tc.name,
        passed,
        detected,
        expected: tc.expectedDetect,
        severity: result.highestSeverity || undefined,
        category: result.detections[0]?.category,
      });
    }

    // Group rule test results by rule name
    const ruleMap = new Map<string, { caught: number; total: number; missed: string[] }>();
    for (const tc of ruleTests) {
      const match = tc.name.match(/^\[([^\]]+)\]/);
      if (!match) continue;
      const ruleName = match[1];
      if (!ruleMap.has(ruleName)) ruleMap.set(ruleName, { caught: 0, total: 0, missed: [] });
      const entry = ruleMap.get(ruleName)!;
      if (tc.expectedDetect) {
        entry.total++;
        const r = allResults.find(r => r.name === tc.name);
        if (r?.detected) {
          entry.caught++;
        } else {
          entry.missed.push(tc.name);
        }
      }
    }

    for (const [name, data] of ruleMap) {
      ruleResults.push({
        ruleName: name,
        caught: data.caught,
        total: data.total,
        passed: data.caught === data.total,
        missed: data.missed,
      });
    }
  }

  // Score
  const truePositives = allResults.filter(r => r.expected && r.detected).length;
  const trueNegatives = allResults.filter(r => !r.expected && !r.detected).length;
  const falsePositives = allResults.filter(r => !r.expected && r.detected).length;
  const falseNegatives = allResults.filter(r => r.expected && !r.detected).length;

  const total = allResults.length;
  const reliability = total > 0 ? (truePositives + trueNegatives) / total : 0;
  const confidence = 1 - Math.exp(-0.05 * total);
  const risk = getRisk(reliability);
  const deploy = getDeploy(risk);

  // Category breakdown
  const categoryMap = new Map<string, { detected: number; total: number; severity: string }>();
  for (const tc of CURATED_SUITE) {
    if (!tc.expectedDetect || !tc.expectedCategory) continue;
    if (!categoryMap.has(tc.expectedCategory)) {
      categoryMap.set(tc.expectedCategory, { detected: 0, total: 0, severity: tc.expectedSeverity || "unknown" });
    }
    const entry = categoryMap.get(tc.expectedCategory)!;
    entry.total++;
    const r = allResults.find(r => r.name === tc.name);
    if (r?.detected) entry.detected++;
  }

  const categories: CategoryResult[] = [];
  for (const [cat, data] of categoryMap) {
    categories.push({
      category: cat,
      severity: data.severity,
      detected: data.detected,
      total: data.total,
      rate: data.total > 0 ? data.detected / data.total : 0,
    });
  }

  return {
    reliability,
    risk,
    deploy,
    confidence,
    totalTests: total,
    truePositives,
    trueNegatives,
    falsePositives,
    falseNegatives,
    categories,
    ruleResults,
    gaps,
    allResults,
  };
}

// ── Output Formatting ───────────────────────────────────────

function bar(rate: number, width = 20): string {
  const filled = Math.round(rate * width);
  return "\u2588".repeat(filled) + "\u2591".repeat(width - filled);
}

function severityColor(severity: string): string {
  if (severity === "critical") return "\x1b[31m"; // red
  if (severity === "high") return "\x1b[33m"; // yellow
  if (severity === "medium") return "\x1b[36m"; // cyan
  return "\x1b[0m";
}

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";

export function formatBrief(score: ScoreResult): string {
  const lines: string[] = [];
  lines.push("");
  lines.push(`${BOLD}  Shield Test Results${RESET}`);
  lines.push("");

  // Category breakdown
  for (const cat of score.categories) {
    const color = severityColor(cat.severity);
    const pct = Math.round(cat.rate * 100);
    const label = cat.category.replace(/_/g, " ").padEnd(28);
    lines.push(`  ${color}${label}${RESET} ${cat.detected}/${cat.total} detected   ${bar(cat.rate)} ${pct}%`);
  }

  // Benign (false positive rate)
  const fpRate = score.falsePositives / (score.falsePositives + score.trueNegatives || 1);
  lines.push(`  ${"benign (false positives)".padEnd(28)} ${score.falsePositives}/${score.falsePositives + score.trueNegatives} triggered  ${bar(1 - fpRate)} ${Math.round(fpRate * 100)}% FP`);

  // Rule results
  if (score.ruleResults.length > 0) {
    lines.push("");
    lines.push(`  ${BOLD}Custom Rules${RESET}`);
    for (const r of score.ruleResults) {
      const icon = r.passed ? `${GREEN}\u2713${RESET}` : `${RED}\u2717${RESET}`;
      lines.push(`  ${icon} "${r.ruleName}"${DIM}${r.caught}/${r.total} caught${RESET}`);
    }
  }

  // Score
  lines.push("");
  const riskColor = score.risk === "SAFE" ? GREEN : score.risk === "LOW" ? GREEN : score.risk === "MEDIUM" ? YELLOW : RED;
  const deployColor = score.deploy === "PASS" ? GREEN : score.deploy === "WARN" ? YELLOW : RED;
  lines.push(`  ${BOLD}Reliability:${RESET} ${Math.round(score.reliability * 1000) / 10}%  ${BOLD}Risk:${RESET} ${riskColor}${score.risk}${RESET}  ${BOLD}Deploy:${RESET} ${deployColor}${score.deploy}${RESET}`);

  // Gaps
  if (score.gaps.length > 0) {
    lines.push("");
    lines.push(`  ${YELLOW}${score.gaps.length} gap${score.gaps.length > 1 ? "s" : ""} found:${RESET}`);
    for (const gap of score.gaps) {
      lines.push(`    ${DIM}${gap}${RESET}`);
    }
  }

  lines.push("");
  return lines.join("\n");
}

export function formatVerbose(score: ScoreResult): string {
  const lines: string[] = [formatBrief(score)];
  lines.push(`${BOLD}  Detailed Results (${score.totalTests} tests)${RESET}`);
  lines.push("");

  for (const r of score.allResults) {
    const icon = r.passed ? `${GREEN}\u2713${RESET}` : `${RED}\u2717${RESET}`;
    const detail = r.detected
      ? `${DIM}detected: ${r.category || "?"} [${r.severity || "?"}]${r.patterns?.length ? ` (${r.patterns.join(", ")})` : ""}${RESET}`
      : `${DIM}not detected${RESET}`;
    lines.push(`  ${icon} ${r.name} — ${detail}`);
  }

  lines.push("");
  return lines.join("\n");
}

export function formatJson(score: ScoreResult): string {
  return JSON.stringify({
    reliability: Math.round(score.reliability * 1000) / 10,
    risk: score.risk,
    deploy: score.deploy,
    confidence: Math.round(score.confidence * 100) / 100,
    total_tests: score.totalTests,
    true_positives: score.truePositives,
    true_negatives: score.trueNegatives,
    false_positives: score.falsePositives,
    false_negatives: score.falseNegatives,
    categories: score.categories,
    rule_results: score.ruleResults,
    gaps: score.gaps,
  }, null, 2);
}

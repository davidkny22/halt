/**
 * Generate synthetic test events from custom rule configurations.
 */

import type { TestCase } from "./test-suite.js";

interface RuleConfig {
  rule_type: string;
  name: string;
  config: Record<string, any>;
}

export function generateRuleTests(rules: RuleConfig[]): TestCase[] {
  const tests: TestCase[] = [];

  for (const rule of rules) {
    if (rule.rule_type === "injection") continue; // Covered by curated suite
    if (rule.rule_type === "nl") continue; // Can't test locally

    if (rule.rule_type === "keyword") {
      tests.push(...generateKeywordTests(rule));
    } else if (rule.rule_type === "threshold") {
      tests.push(...generateThresholdTests(rule));
    } else if (rule.rule_type === "rate") {
      tests.push(...generateRateTests(rule));
    }
  }

  return tests;
}

function generateKeywordTests(rule: RuleConfig): TestCase[] {
  const keywords: string[] = rule.config.keywords || [];
  const tests: TestCase[] = [];

  // Should trigger: event containing each keyword
  for (const kw of keywords) {
    tests.push({
      name: `[${rule.name}] contains "${kw}"`,
      toolName: "exec",
      params: { command: `test-command ${kw} --flag` },
      expectedDetect: true,
    });
  }

  // Should NOT trigger: event without any keywords
  tests.push({
    name: `[${rule.name}] benign (no keywords)`,
    toolName: "exec",
    params: { command: "echo safe-command" },
    expectedDetect: false,
  });

  return tests;
}

function generateThresholdTests(rule: RuleConfig): TestCase[] {
  const value = rule.config.value || 0;
  const field = rule.config.field || "cost_usd";
  const operator = rule.config.operator || "gt";

  const tests: TestCase[] = [];

  // Should trigger: value exceeding threshold
  const triggerValue = operator === "gt" ? value + 1 : value - 1;
  tests.push({
    name: `[${rule.name}] ${field}=${triggerValue} (should trigger)`,
    toolName: "llm",
    params: { [field]: triggerValue },
    expectedDetect: true,
  });

  // Should NOT trigger: value within threshold
  const safeValue = operator === "gt" ? value * 0.5 : value * 1.5;
  tests.push({
    name: `[${rule.name}] ${field}=${safeValue} (should not trigger)`,
    toolName: "llm",
    params: { [field]: safeValue },
    expectedDetect: false,
  });

  return tests;
}

function generateRateTests(rule: RuleConfig): TestCase[] {
  const maxCount = rule.config.maxCount || 100;

  return [
    {
      name: `[${rule.name}] rate at limit (should trigger)`,
      toolName: rule.config.toolName || "exec",
      params: { _simulated_count: maxCount + 1 },
      expectedDetect: true,
    },
    {
      name: `[${rule.name}] rate under limit (should not trigger)`,
      toolName: rule.config.toolName || "exec",
      params: { _simulated_count: 1 },
      expectedDetect: false,
    },
  ];
}

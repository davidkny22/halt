/**
 * Local config/rules persistence for offline mode.
 * Reads/writes to ~/.clawnitor/ directory.
 * Shared between the local dashboard (serve) and the plugin (rule-cache).
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const CONFIG_DIR = join(homedir(), ".clawnitor");
const RULES_PATH = join(CONFIG_DIR, "rules.json");
const AGENTS_PATH = join(CONFIG_DIR, "agents.json");

function ensureDir() {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

// --- Rules ---

export interface LocalRule {
  id: string;
  name: string;
  rule_type: "keyword" | "rate" | "threshold";
  config: Record<string, any>;
  enabled: boolean;
  action_mode: "block" | "alert" | "both";
  agent_visible?: boolean;
  agent_ids?: string[] | null;
  created_at?: string;
}

export function readRules(): LocalRule[] {
  try {
    if (!existsSync(RULES_PATH)) return [];
    const raw = readFileSync(RULES_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeRules(rules: LocalRule[]): void {
  ensureDir();
  writeFileSync(RULES_PATH, JSON.stringify(rules, null, 2), "utf-8");
}

export function addRule(rule: Omit<LocalRule, "id" | "created_at">): LocalRule {
  const rules = readRules();
  const newRule: LocalRule = {
    ...rule,
    id: "rule-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    created_at: new Date().toISOString(),
  };
  rules.push(newRule);
  writeRules(rules);
  return newRule;
}

export function deleteRule(id: string): boolean {
  const rules = readRules();
  const filtered = rules.filter((r) => r.id !== id);
  if (filtered.length === rules.length) return false;
  writeRules(filtered);
  return true;
}

export function toggleRule(id: string): LocalRule | null {
  const rules = readRules();
  const rule = rules.find((r) => r.id === id);
  if (!rule) return null;
  rule.enabled = !rule.enabled;
  writeRules(rules);
  return rule;
}

// --- Agent configs (auto-kill settings) ---

export interface AgentConfig {
  auto_kill_enabled: boolean;
  auto_kill_threshold: number;
  auto_kill_window_minutes: number;
}

function readAgentConfigs(): Record<string, AgentConfig> {
  try {
    if (!existsSync(AGENTS_PATH)) return {};
    const raw = readFileSync(AGENTS_PATH, "utf-8");
    return JSON.parse(raw) || {};
  } catch {
    return {};
  }
}

function writeAgentConfigs(configs: Record<string, AgentConfig>): void {
  ensureDir();
  writeFileSync(AGENTS_PATH, JSON.stringify(configs, null, 2), "utf-8");
}

const DEFAULT_AGENT_CONFIG: AgentConfig = {
  auto_kill_enabled: true,
  auto_kill_threshold: 3,
  auto_kill_window_minutes: 10,
};

export function getAgentConfig(agentId: string): AgentConfig {
  const configs = readAgentConfigs();
  return configs[agentId] || { ...DEFAULT_AGENT_CONFIG };
}

export function setAgentConfig(agentId: string, config: Partial<AgentConfig>): AgentConfig {
  const configs = readAgentConfigs();
  const existing = configs[agentId] || { ...DEFAULT_AGENT_CONFIG };
  const updated = { ...existing, ...config };
  configs[agentId] = updated;
  writeAgentConfigs(configs);
  return updated;
}

// --- Paths (for plugin integration) ---

export const RULES_FILE_PATH = RULES_PATH;
export const CONFIG_DIR_PATH = CONFIG_DIR;

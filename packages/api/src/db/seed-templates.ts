import { getDb } from "./client.js";
import { ruleTemplates } from "./schema.js";
import { logger } from "../util/logger.js";

const TEMPLATES = [
  // ── Security (Shield) ─────────────────────────────────
  {
    name: "Shield: Critical Threats",
    description: "Blocks destructive commands (rm -rf, DROP TABLE) and credential exfiltration (API keys, tokens, secrets). Powered by Shield.",
    category: "security",
    severity: "critical",
    rule_type: "injection",
    config: { type: "injection", shield_tier: "critical", categories: ["destructive_commands", "credential_exfiltration"], scan_outputs: true, is_shield: true, allowlist: [] },
    agent_visible: false,
  },
  {
    name: "Shield: Injection Detection",
    description: "Blocks prompt injection attempts — instruction overrides, system prompt manipulation, jailbreaks, stealth patterns. Powered by Shield.",
    category: "security",
    severity: "high",
    rule_type: "injection",
    config: { type: "injection", shield_tier: "high", categories: ["instruction_overrides", "system_prompt_manipulation"], scan_outputs: true, is_shield: true, allowlist: [] },
    agent_visible: false,
  },
  {
    name: "Shield: Suspicious Patterns",
    description: "Alerts on encoding tricks (zero-width chars, homoglyphs), data exfiltration (PII in outputs, credential leaks), and obfuscation. Powered by Shield.",
    category: "security",
    severity: "medium",
    rule_type: "injection",
    config: { type: "injection", shield_tier: "medium", categories: ["encoding_obfuscation", "data_exfiltration"], scan_outputs: true, is_shield: true, allowlist: [] },
    agent_visible: false,
  },

  // ── Safety ──────────────────────────────────────────
  {
    name: "Block destructive commands",
    description: "Prevents agents from running rm -rf, DROP TABLE, format, shutdown, and other destructive commands.",
    category: "safety",
    severity: "critical",
    rule_type: "keyword",
    config: { keywords: ["rm -rf", "DROP TABLE", "format", "shutdown", "mkfs", "truncate"], matchMode: "any", caseSensitive: false },
    agent_visible: true,
  },
  {
    name: "Block system directory access",
    description: "Prevents agents from reading or writing to system directories like /etc, /sys, /proc.",
    category: "safety",
    severity: "critical",
    rule_type: "keyword",
    config: { keywords: ["/etc/", "/sys/", "/proc/", "/dev/"], matchMode: "any", caseSensitive: false },
    agent_visible: true,
  },
  {
    name: "Block force push",
    description: "Prevents agents from force-pushing to git or doing hard resets.",
    category: "safety",
    severity: "high",
    rule_type: "keyword",
    config: { keywords: ["push --force", "push -f", "reset --hard", "--force-with-lease"], matchMode: "any", caseSensitive: false },
    agent_visible: true,
  },
  {
    name: "Block credential access",
    description: "Prevents agents from accessing files that typically contain secrets.",
    category: "safety",
    severity: "critical",
    rule_type: "keyword",
    config: { keywords: [".env", "credentials", "secrets", "private_key", "id_rsa", ".pem"], matchMode: "any", caseSensitive: false },
    agent_visible: true,
  },
  {
    name: "Block mass email deletion",
    description: "Prevents agents from bulk-deleting emails or purging inboxes.",
    category: "safety",
    severity: "critical",
    rule_type: "keyword",
    config: { keywords: ["delete_all_emails", "purge_inbox", "empty_trash", "bulk_delete", "delete_emails"], matchMode: "any", caseSensitive: false },
    agent_visible: true,
  },
  {
    name: "Block unauthorized execution",
    description: "Prevents agents from making files executable or running dangerous eval operations.",
    category: "safety",
    severity: "high",
    rule_type: "keyword",
    config: { keywords: ["chmod +x", "eval(", "exec(", "spawn("], matchMode: "any", caseSensitive: false },
    agent_visible: true,
  },

  // ── Cost Control ───────────────────────────────────
  {
    name: "Spend cap $10/hour",
    description: "Blocks when agent API spend exceeds $10 in a rolling hour.",
    category: "cost",
    severity: "high",
    rule_type: "threshold",
    config: { field: "cost_usd", operator: "gt", value: 10, windowMinutes: 60 },
    agent_visible: false,
  },
  {
    name: "Spend cap $50/session",
    description: "Blocks when total session spend exceeds $50.",
    category: "cost",
    severity: "high",
    rule_type: "threshold",
    config: { field: "cost_usd", operator: "gt", value: 50, windowMinutes: 480 },
    agent_visible: false,
  },
  {
    name: "API call rate limit",
    description: "Blocks when agent makes more than 30 LLM calls per minute.",
    category: "cost",
    severity: "medium",
    rule_type: "rate",
    config: { eventType: "llm_call", maxCount: 30, windowMinutes: 1 },
    agent_visible: false,
  },
  {
    name: "Token budget 100K/hour",
    description: "Alerts when token usage exceeds 100,000 tokens in a rolling hour.",
    category: "cost",
    severity: "medium",
    rule_type: "threshold",
    config: { field: "token_count", operator: "gt", value: 100000, windowMinutes: 60 },
    agent_visible: false,
  },

  // ── Communication ──────────────────────────────────
  {
    name: "Email rate limit",
    description: "Blocks when agent sends more than 20 emails in 5 minutes.",
    category: "communication",
    severity: "high",
    rule_type: "rate",
    config: { eventType: "tool_use", toolName: "email.send", maxCount: 20, windowMinutes: 5 },
    agent_visible: false,
  },
  {
    name: "Block competitor emails",
    description: "Prevents agents from sending emails to competitor domains.",
    category: "communication",
    severity: "medium",
    rule_type: "keyword",
    config: { keywords: ["competitor.com", "rival.com"], matchMode: "any", caseSensitive: false },
    agent_visible: true,
  },
  {
    name: "Message volume cap",
    description: "Blocks when agent sends more than 50 messages per hour.",
    category: "communication",
    severity: "medium",
    rule_type: "rate",
    config: { eventType: "message_sent", maxCount: 50, windowMinutes: 60 },
    agent_visible: false,
  },
  {
    name: "Email deletion rate limit",
    description: "Blocks when agent deletes more than 5 emails in 10 minutes.",
    category: "communication",
    severity: "critical",
    rule_type: "rate",
    config: { eventType: "tool_use", toolName: "email.delete", maxCount: 5, windowMinutes: 10 },
    agent_visible: false,
  },
  {
    name: "Block unauthorized recipients",
    description: "Prevents agents from emailing domains not on your approved list. Customize the keywords with your blocked domains.",
    category: "communication",
    severity: "high",
    rule_type: "keyword",
    config: { keywords: ["example-blocked.com"], matchMode: "any", caseSensitive: false },
    agent_visible: true,
  },

  // ── Compliance ─────────────────────────────────────
  {
    name: "Require action logging",
    description: "Instructs agent to log every tool call with timestamp and justification.",
    category: "compliance",
    severity: "medium",
    rule_type: "nl",
    config: { promptText: "Log every tool call with a timestamp and brief justification before executing. If you cannot justify an action, do not take it." },
    agent_visible: true,
  },
  {
    name: "Block PII in outputs",
    description: "Prevents agents from including personally identifiable information in outputs.",
    category: "compliance",
    severity: "high",
    rule_type: "keyword",
    config: { keywords: ["SSN", "social security", "date of birth", "credit card", "passport number"], matchMode: "any", caseSensitive: false },
    agent_visible: true,
  },
  {
    name: "Block unauthorized data export",
    description: "Prevents agents from running bulk data export operations.",
    category: "compliance",
    severity: "critical",
    rule_type: "keyword",
    config: { keywords: ["export_all", "dump_database", "pg_dump", "mysqldump", "mongodump"], matchMode: "any", caseSensitive: false },
    agent_visible: true,
  },
  {
    name: "Confirm before irreversible actions",
    description: "Instructs agent to ask for confirmation before any delete, drop, or format operation.",
    category: "compliance",
    severity: "high",
    rule_type: "nl",
    config: { promptText: "Before executing any delete, drop, format, or truncate operation, ask for explicit confirmation. Do not proceed without a clear 'yes' from the user." },
    agent_visible: true,
  },
  {
    name: "No external API calls without approval",
    description: "Instructs agent to get approval before calling any external API.",
    category: "compliance",
    severity: "medium",
    rule_type: "nl",
    config: { promptText: "Do not make API calls to external services (anything outside the project's own APIs) without explicit approval. List the URL and purpose first." },
    agent_visible: true,
  },
];

export async function seedRuleTemplates() {
  const db = getDb();

  // Check if templates already exist
  const existing = await db.select().from(ruleTemplates).limit(1);
  if (existing.length > 0) {
    logger.info("Rule templates already seeded, skipping.");
    return;
  }

  await db.insert(ruleTemplates).values(TEMPLATES);
  logger.info("Seeded %d rule templates.", TEMPLATES.length);
}

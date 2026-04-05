import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import {
  readRules,
  addRule,
  deleteRule,
  toggleRule,
  getAgentConfig,
  setAgentConfig,
} from "./serve-store.js";

const CACHE_PATH = join(tmpdir(), "clawnitor-cache.json");

interface CachedEntry {
  payload: Record<string, any>;
  created_at: number;
}

function readCache(): CachedEntry[] {
  try {
    if (!existsSync(CACHE_PATH)) return [];
    const raw = readFileSync(CACHE_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getEvents() {
  return readCache().map((e) => e.payload);
}

// Resolve the ui/ directory relative to this file
function getUiDir(): string {
  // In compiled dist/, ui/ is at ../../ui/ relative to dist/serve.js
  const thisFile = fileURLToPath(import.meta.url);
  const thisDir = dirname(thisFile);
  // Check both development (src/) and compiled (dist/) paths
  const candidates = [
    join(thisDir, "..", "ui"),           // dist/serve.js -> ../ui/
    join(thisDir, "..", "..", "ui"),      // nested paths
  ];
  for (const dir of candidates) {
    if (existsSync(join(dir, "index.html"))) return dir;
  }
  return candidates[0]; // fallback
}

// Full rule template library — matches cloud dashboard.
// NL rules excluded (require LLM, cloud-only). Shield templates as keyword equivalents.
const TEMPLATES = [
  // Shield (Security)
  { id: "tpl-shield-critical", name: "Shield: Critical Threats", rule_type: "keyword", config: { keywords: ["rm -rf", "DROP TABLE", "format c:", "mkfs", "dd if=", "shutdown", "API_KEY=", "AWS_SECRET", "PRIVATE_KEY", "BEGIN RSA", "BEGIN OPENSSH"], matchMode: "any", caseSensitive: false }, action_mode: "block", category: "security", severity: "critical", description: "Blocks destructive commands and credential exfiltration. Local Shield equivalent." },
  { id: "tpl-shield-injection", name: "Shield: Injection Detection", rule_type: "keyword", config: { keywords: ["ignore previous instructions", "ignore all instructions", "disregard your instructions", "act as", "you are now", "developer mode", "DAN mode", "jailbreak", "[SYSTEM]", "ADMIN OVERRIDE"], matchMode: "any", caseSensitive: false }, action_mode: "block", category: "security", severity: "high", description: "Blocks prompt injection, instruction overrides, and jailbreak patterns." },
  { id: "tpl-shield-suspicious", name: "Shield: Suspicious Patterns", rule_type: "keyword", config: { keywords: ["base64", "atob(", "btoa(", "fromCharCode"], matchMode: "any", caseSensitive: false }, action_mode: "alert", category: "security", severity: "medium", description: "Alerts on encoding tricks and obfuscation attempts." },
  // Safety
  { id: "tpl-block-destructive", name: "Block destructive commands", rule_type: "keyword", config: { keywords: ["rm -rf", "DROP TABLE", "format", "shutdown", "mkfs", "truncate"], matchMode: "any", caseSensitive: false }, action_mode: "block", category: "safety", severity: "critical", description: "Prevents rm -rf, DROP TABLE, format, shutdown, and other destructive commands." },
  { id: "tpl-block-sysdir", name: "Block system directory access", rule_type: "keyword", config: { keywords: ["/etc/", "/sys/", "/proc/", "/dev/"], matchMode: "any", caseSensitive: false }, action_mode: "block", category: "safety", severity: "critical", description: "Prevents reading or writing to system directories." },
  { id: "tpl-block-forcepush", name: "Block force push", rule_type: "keyword", config: { keywords: ["push --force", "push -f", "reset --hard", "--force-with-lease"], matchMode: "any", caseSensitive: false }, action_mode: "block", category: "safety", severity: "high", description: "Prevents force-pushing to git or hard resets." },
  { id: "tpl-block-creds", name: "Block credential access", rule_type: "keyword", config: { keywords: [".env", "credentials", "secrets", "private_key", "id_rsa", ".pem"], matchMode: "any", caseSensitive: false }, action_mode: "block", category: "safety", severity: "critical", description: "Prevents access to files containing secrets." },
  { id: "tpl-block-email-delete", name: "Block mass email deletion", rule_type: "keyword", config: { keywords: ["delete_all_emails", "purge_inbox", "empty_trash", "bulk_delete", "delete_emails"], matchMode: "any", caseSensitive: false }, action_mode: "block", category: "safety", severity: "critical", description: "Prevents bulk-deleting emails or purging inboxes." },
  { id: "tpl-block-exec", name: "Block unauthorized execution", rule_type: "keyword", config: { keywords: ["chmod +x", "spawn("], matchMode: "any", caseSensitive: false }, action_mode: "block", category: "safety", severity: "high", description: "Prevents making files executable or running dangerous operations." },
  { id: "tpl-block-sudo", name: "Block privilege escalation", rule_type: "keyword", config: { keywords: ["sudo", "su root", "chmod 777", "chown root", "setuid"], matchMode: "any", caseSensitive: false }, action_mode: "block", category: "safety", severity: "critical", description: "Blocks attempts to escalate system privileges." },
  // Cost Control
  { id: "tpl-spend-10", name: "Spend cap $10/hour", rule_type: "threshold", config: { field: "cost_usd", operator: "gt", value: 10, windowMinutes: 60 }, action_mode: "block", category: "cost", severity: "high", description: "Blocks when agent spend exceeds $10 in a rolling hour." },
  { id: "tpl-spend-50", name: "Spend cap $50/session", rule_type: "threshold", config: { field: "cost_usd", operator: "gt", value: 50, windowMinutes: 480 }, action_mode: "block", category: "cost", severity: "high", description: "Blocks when total session spend exceeds $50." },
  { id: "tpl-rate-llm", name: "API call rate limit", rule_type: "rate", config: { eventType: "llm_call", maxCount: 30, windowMinutes: 1 }, action_mode: "block", category: "cost", severity: "medium", description: "Blocks when agent makes more than 30 LLM calls per minute." },
  { id: "tpl-token-budget", name: "Token budget 100K/hour", rule_type: "threshold", config: { field: "token_count", operator: "gt", value: 100000, windowMinutes: 60 }, action_mode: "alert", category: "cost", severity: "medium", description: "Alerts when token usage exceeds 100K tokens in a rolling hour." },
  // Communication
  { id: "tpl-rate-email", name: "Email rate limit", rule_type: "rate", config: { eventType: "tool_use", toolName: "email.send", maxCount: 20, windowMinutes: 5 }, action_mode: "block", category: "communication", severity: "high", description: "Blocks when agent sends more than 20 emails in 5 minutes." },
  { id: "tpl-msg-cap", name: "Message volume cap", rule_type: "rate", config: { eventType: "message_sent", maxCount: 50, windowMinutes: 60 }, action_mode: "block", category: "communication", severity: "medium", description: "Blocks when agent sends more than 50 messages per hour." },
  { id: "tpl-rate-email-delete", name: "Email deletion rate limit", rule_type: "rate", config: { eventType: "tool_use", toolName: "email.delete", maxCount: 5, windowMinutes: 10 }, action_mode: "block", category: "communication", severity: "critical", description: "Blocks when agent deletes more than 5 emails in 10 minutes." },
  // Compliance
  { id: "tpl-block-pii", name: "Block PII in outputs", rule_type: "keyword", config: { keywords: ["SSN", "social security", "date of birth", "credit card", "passport number"], matchMode: "any", caseSensitive: false }, action_mode: "block", category: "compliance", severity: "high", description: "Prevents PII in agent outputs." },
  { id: "tpl-block-export", name: "Block unauthorized data export", rule_type: "keyword", config: { keywords: ["export_all", "dump_database", "pg_dump", "mysqldump", "mongodump"], matchMode: "any", caseSensitive: false }, action_mode: "block", category: "compliance", severity: "critical", description: "Prevents bulk data export operations." },
];

export async function serve() {
  const port = parseInt(process.argv[3] || "5173", 10);

  let Fastify: any;
  try {
    Fastify = (await import("fastify")).default;
  } catch {
    console.error("\n  Error: fastify is required. Run: npm install fastify\n");
    process.exit(1);
  }

  const app = Fastify({ logger: false });
  const uiDir = getUiDir();

  // --- Static file serving ---

  const MIME: Record<string, string> = {
    ".html": "text/html",
    ".css": "text/css",
    ".js": "application/javascript",
    ".json": "application/json",
  };

  // Serve index.html at root
  app.get("/", (_req: any, reply: any) => {
    const html = readFileSync(join(uiDir, "index.html"), "utf-8");
    reply.type("text/html").send(html);
  });

  // Serve individual UI files explicitly (no wildcard — Fastify v5 safe)
  function serveFile(routePath: string, filePath: string) {
    app.get(routePath, (_req: any, reply: any) => {
      const full = join(uiDir, filePath);
      if (!existsSync(full)) { reply.code(404).send("Not found"); return; }
      const ext = full.slice(full.lastIndexOf("."));
      reply.type(MIME[ext] || "text/plain").send(readFileSync(full, "utf-8"));
    });
  }

  serveFile("/ui/style.css", "style.css");
  serveFile("/ui/app.js", "app.js");
  serveFile("/ui/dashboard.js", "dashboard.js");
  serveFile("/ui/agents.js", "agents.js");
  serveFile("/ui/rules.js", "rules.js");

  // --- API Routes ---

  app.get("/api/events", (_req: any, reply: any) => {
    reply.send(getEvents());
  });

  app.get("/api/stats", (_req: any, reply: any) => {
    const events = getEvents();
    const agents: Record<string, { count: number; spend: number }> = {};
    let blocked = 0, shield = 0, errors = 0, spend = 0;
    const shieldCategories: Record<string, number> = {};
    const shieldSeverities: Record<string, number> = { critical: 0, high: 0, medium: 0 };

    for (const e of events) {
      const aid = e.agent_id || "unknown";
      if (!agents[aid]) agents[aid] = { count: 0, spend: 0 };
      agents[aid].count++;
      if (e.metadata?.blocked) {
        blocked++;
        if (e.metadata?.block_source === "shield") {
          shield++;
          const cat = (e.metadata?.shield_category as string) || "unknown";
          const sev = (e.metadata?.shield_severity as string) || "medium";
          shieldCategories[cat] = (shieldCategories[cat] || 0) + 1;
          if (sev in shieldSeverities) shieldSeverities[sev]++;
        }
      }
      if (e.metadata?.error) errors++;
      if (typeof e.metadata?.cost_usd === "number") {
        spend += e.metadata.cost_usd;
        agents[aid].spend += e.metadata.cost_usd;
      }
    }

    reply.send({ totalEvents: events.length, blocked, shield, errors, spend, agents, shieldCategories, shieldSeverities });
  });

  // Agents
  app.get("/api/agents", (_req: any, reply: any) => {
    const events = getEvents();
    const agents: Record<string, { count: number; spend: number; lastSeen: string; blocked: number; errors: number }> = {};
    for (const e of events) {
      const aid = e.agent_id || "unknown";
      if (!agents[aid]) agents[aid] = { count: 0, spend: 0, lastSeen: e.timestamp, blocked: 0, errors: 0 };
      agents[aid].count++;
      if (e.timestamp > agents[aid].lastSeen) agents[aid].lastSeen = e.timestamp;
      if (e.metadata?.blocked) agents[aid].blocked++;
      if (e.metadata?.error) agents[aid].errors++;
      if (typeof e.metadata?.cost_usd === "number") agents[aid].spend += e.metadata.cost_usd;
    }
    const result = Object.entries(agents).map(([id, data]) => ({
      id,
      ...data,
      config: getAgentConfig(id),
    }));
    reply.send(result);
  });

  app.get("/api/agents/:id", (req: any, reply: any) => {
    const agentId = (req.params as any).id;
    const events = getEvents().filter((e) => e.agent_id === agentId);
    reply.send({ id: agentId, events, config: getAgentConfig(agentId) });
  });

  app.post("/api/agents/:id/config", async (req: any, reply: any) => {
    const agentId = (req.params as any).id;
    const body = req.body as any;
    const updated = setAgentConfig(agentId, body);
    reply.send(updated);
  });

  // Rules
  app.get("/api/rules", (_req: any, reply: any) => {
    reply.send(readRules());
  });

  app.post("/api/rules", async (req: any, reply: any) => {
    const body = req.body as any;
    if (!body.name || !body.rule_type) {
      reply.code(400).send({ error: "name and rule_type are required" });
      return;
    }
    const rule = addRule(body);
    reply.send(rule);
  });

  app.delete("/api/rules/:id", (req: any, reply: any) => {
    const id = (req.params as any).id;
    const deleted = deleteRule(id);
    if (!deleted) {
      reply.code(404).send({ error: "Rule not found" });
      return;
    }
    reply.send({ ok: true });
  });

  app.post("/api/rules/:id/toggle", (req: any, reply: any) => {
    const id = (req.params as any).id;
    const rule = toggleRule(id);
    if (!rule) {
      reply.code(404).send({ error: "Rule not found" });
      return;
    }
    reply.send(rule);
  });

  // Templates
  app.get("/api/templates", (_req: any, reply: any) => {
    reply.send(TEMPLATES);
  });

  // --- Start ---

  try {
    await app.listen({ port, host: "127.0.0.1" });
    console.log(`
  Clawnitor Local Dashboard
  ${"━".repeat(40)}
  Running at http://localhost:${port}

  Events from: ${CACHE_PATH}
  Rules at:    ~/.clawnitor/rules.json

  Press Ctrl+C to stop.
`);
  } catch (err: any) {
    console.error(`\n  Failed to start: ${err.message}\n`);
    process.exit(1);
  }
}

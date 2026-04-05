import { readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

interface CachedEntry {
  payload: {
    event_id: string;
    agent_id: string;
    session_id: string;
    event_type: string;
    action: string;
    target?: string;
    timestamp: string;
    severity_hint?: string;
    metadata?: Record<string, unknown>;
  };
  created_at: number;
}

export async function report() {
  const cachePath = join(tmpdir(), "halt-cache.json");

  let entries: CachedEntry[];
  try {
    const raw = readFileSync(cachePath, "utf-8");
    entries = JSON.parse(raw);
    if (!Array.isArray(entries)) {
      console.log("\n  No events found. Run an agent with Halt first.\n");
      return;
    }
  } catch {
    console.log("\n  No events found. Run an agent with Halt first.\n");
    return;
  }

  if (entries.length === 0) {
    console.log("\n  No events found. Run an agent with Halt first.\n");
    return;
  }

  const events = entries.map((e) => e.payload);

  // Compute stats
  const totalEvents = events.length;
  const agents = new Set(events.map((e) => e.agent_id));
  const blocked = events.filter((e) => e.metadata?.blocked === true);
  const errors = events.filter((e) => e.metadata?.error);

  // Shield detections
  const shieldBlocked = blocked.filter((e) => e.metadata?.block_source === "shield");
  const shieldBySeverity = { critical: 0, high: 0, medium: 0 };
  for (const e of shieldBlocked) {
    const sev = (e.metadata?.shield_severity as string) || "medium";
    if (sev in shieldBySeverity) shieldBySeverity[sev as keyof typeof shieldBySeverity]++;
  }

  // Rule blocks
  const ruleBlocked = blocked.filter((e) => e.metadata?.block_source === "rule-cache");

  // Spend
  let totalSpend = 0;
  for (const e of events) {
    if (typeof e.metadata?.cost_usd === "number") totalSpend += e.metadata.cost_usd;
  }

  // Severity distribution
  const severity = { normal: 0, elevated: 0, critical: 0 };
  for (const e of events) {
    const s = e.severity_hint || "normal";
    if (s === "critical") severity.critical++;
    else if (s === "elevated") severity.elevated++;
    else severity.normal++;
  }

  // Time range
  const timestamps = events.map((e) => new Date(e.timestamp).getTime()).sort();
  const oldest = new Date(timestamps[0]);
  const newest = new Date(timestamps[timestamps.length - 1]);

  console.log(`
  Halt Local Report
  ${"━".repeat(40)}
  Events captured:     ${totalEvents}
  Shield detections:   ${shieldBlocked.length}${shieldBlocked.length > 0 ? ` (${shieldBySeverity.critical} critical, ${shieldBySeverity.high} high, ${shieldBySeverity.medium} medium)` : ""}
  Rule blocks:         ${ruleBlocked.length}
  Blocked actions:     ${blocked.length}
  Errors:              ${errors.length}
  Agents seen:         ${agents.size} (${[...agents].join(", ")})
  Total spend:         $${totalSpend.toFixed(2)}
  Time range:          ${oldest.toLocaleString()} — ${newest.toLocaleString()}`);

  // Top blocked actions
  if (blocked.length > 0) {
    console.log(`
  Top blocked actions:`);
    const top = blocked.slice(-10).reverse();
    for (const e of top) {
      const source = e.metadata?.block_source || "unknown";
      const reason = e.metadata?.block_reason || e.action;
      console.log(`    ${reason}  (${source})`);
    }
  }

  // Severity distribution
  console.log(`
  Severity:  normal: ${severity.normal} | elevated: ${severity.elevated} | critical: ${severity.critical}
`);
}

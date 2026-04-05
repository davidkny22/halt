import { readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { findConfig } from "./config.js";

export async function discover() {
  // 1. Resolve API key
  const apiKey = resolveApiKey();
  if (!apiKey) {
    console.error("\n  No API key found. Run `halt init` first.\n");
    process.exit(1);
  }

  // 2. Read openclaw.json agent list + tools
  const configPath = join(homedir(), ".openclaw", "openclaw.json");
  let agentIds: string[];
  const toolNames = new Set<string>();
  try {
    const raw = readFileSync(configPath, "utf-8");
    const parsed = JSON.parse(raw);
    const agentList = parsed?.agents?.list;
    if (!Array.isArray(agentList) || agentList.length === 0) {
      console.error("\n  No agents found in ~/.openclaw/openclaw.json\n");
      process.exit(1);
    }
    agentIds = agentList
      .map((a: any) => a?.id)
      .filter((id: unknown): id is string => typeof id === "string" && id.length > 0);

    // Extract tool names from agent deny/allow lists
    for (const agent of agentList) {
      for (const t of agent?.tools?.deny || []) if (typeof t === "string") toolNames.add(t);
      for (const t of agent?.tools?.allow || []) if (typeof t === "string") toolNames.add(t);
    }
  } catch {
    console.error("\n  Could not read ~/.openclaw/openclaw.json\n");
    process.exit(1);
  }

  if (agentIds.length === 0) {
    console.error("\n  No agent IDs found in config\n");
    process.exit(1);
  }

  console.log(`\n  Found ${agentIds.length} agent(s): ${agentIds.join(", ")}`);
  if (toolNames.size > 0) {
    console.log(`  Found ${toolNames.size} tool(s) across agent configs`);
  }
  console.log("  Registering with halt...\n");

  // 3. Call discover endpoint
  const backendUrl = resolveBackendUrl();
  const res = await fetch(`${backendUrl}/api/agents/discover`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      agents: agentIds,
      tools: toolNames.size > 0 ? [...toolNames].sort() : undefined,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`  Failed (${res.status}): ${body}\n`);
    process.exit(1);
  }

  const result = await res.json() as {
    discovered: number;
    already_registered: number;
    created: string[];
    skipped: number;
  };

  if (result.created.length > 0) {
    console.log(`  Discovered ${result.created.length} new agent(s):`);
    for (const id of result.created) {
      console.log(`    + ${id}`);
    }
  }

  if (result.already_registered > 0) {
    console.log(`  ${result.already_registered} agent(s) already registered`);
  }

  if (result.skipped > 0) {
    console.log(`  ${result.skipped} agent(s) skipped (agent limit reached)`);
  }

  console.log("\n  Activate agents from the dashboard at app.halt.dev/agents\n");
}

function resolveApiKey(): string | null {
  if (process.env.HALT_API_KEY) return process.env.HALT_API_KEY;

  const configPath = findConfig();
  if (!configPath) return null;

  try {
    const raw = readFileSync(configPath, "utf-8");
    const config = JSON.parse(raw);
    return (
      config?.plugins?.entries?.halt?.config?.apiKey ||
      config?.plugins?.entries?.["@halt/plugin"]?.config?.apiKey ||
      null
    );
  } catch {
    return null;
  }
}

function resolveBackendUrl(): string {
  const configPath = findConfig();
  if (configPath) {
    try {
      const raw = readFileSync(configPath, "utf-8");
      const config = JSON.parse(raw);
      const url = config?.plugins?.entries?.halt?.config?.backendUrl;
      if (url) return url;
    } catch {}
  }
  return "https://api.halt.dev";
}

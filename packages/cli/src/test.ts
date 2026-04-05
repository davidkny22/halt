/**
 * `halt test` — Test Shield config and custom rules against synthetic attacks.
 */

import { readFileSync } from "node:fs";
import { runTests, formatBrief, formatVerbose, formatJson } from "./test-runner.js";

interface TestOptions {
  local?: string;
  verbose?: boolean;
  json?: boolean;
  apiKey?: string;
  apiUrl?: string;
}

function parseArgs(): TestOptions {
  const args = process.argv.slice(3); // skip "node", script, "test"
  const opts: TestOptions = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--local" && args[i + 1]) {
      opts.local = args[++i];
    } else if (args[i] === "--verbose" || args[i] === "-v") {
      opts.verbose = true;
    } else if (args[i] === "--json") {
      opts.json = true;
    } else if (args[i] === "--api-key" && args[i + 1]) {
      opts.apiKey = args[++i];
    } else if (args[i] === "--api-url" && args[i + 1]) {
      opts.apiUrl = args[++i];
    }
  }

  return opts;
}

async function fetchRulesFromApi(apiKey: string, apiUrl: string): Promise<any[] | null> {
  try {
    const res = await fetch(`${apiUrl}/api/rules`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.rules || [];
  } catch {
    return null;
  }
}

function loadLocalRules(path: string): any[] {
  try {
    const raw = readFileSync(path, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : parsed.rules || [];
  } catch (err) {
    console.error(`  Failed to read rules from ${path}: ${(err as Error).message}`);
    process.exit(1);
  }
}

function findApiKey(): string | null {
  // Check env
  if (process.env.HALT_API_KEY) return process.env.HALT_API_KEY;

  // Check openclaw.json in cwd
  try {
    const raw = readFileSync("openclaw.json", "utf-8");
    const config = JSON.parse(raw);
    const pluginConfig = config?.plugins?.["@halt/plugin"] || config?.plugins?.halt;
    return pluginConfig?.apiKey || null;
  } catch {
    return null;
  }
}

export async function test() {
  const opts = parseArgs();
  let rules: any[] | null = null;

  if (opts.local) {
    // Local mode: load rules from file
    rules = loadLocalRules(opts.local);
    if (!opts.json) console.log(`\n  Loading rules from ${opts.local}...`);
  } else {
    // API mode: try to fetch rules
    const apiKey = opts.apiKey || findApiKey();
    const apiUrl = opts.apiUrl || "https://api.halt.dev";

    if (apiKey) {
      if (!opts.json) console.log("\n  Fetching rules from API...");
      rules = await fetchRulesFromApi(apiKey, apiUrl);
      if (!rules && !opts.json) {
        console.log("  Could not reach API — running curated suite only.");
      }
    } else {
      if (!opts.json) console.log("\n  No API key found — running curated suite only.");
      if (!opts.json) console.log("  Set HALT_API_KEY or use --local rules.json for custom rule testing.");
    }
  }

  const score = await runTests(rules || undefined);

  if (opts.json) {
    console.log(formatJson(score));
  } else if (opts.verbose) {
    console.log(formatVerbose(score));
  } else {
    console.log(formatBrief(score));
  }

  // Exit code for CI/CD
  if (score.deploy === "BLOCK") {
    process.exit(1);
  }
}

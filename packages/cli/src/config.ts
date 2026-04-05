import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

const CONFIG_FILE = "openclaw.json";
const MAX_SEARCH_DEPTH = 5;

export function findConfig(): string | null {
  let dir = process.cwd();

  for (let i = 0; i < MAX_SEARCH_DEPTH; i++) {
    const configPath = join(dir, CONFIG_FILE);
    if (existsSync(configPath)) return configPath;

    const parent = resolve(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }

  return null;
}

export function writeApiKey(apiKey: string): string {
  let configPath = findConfig();

  if (configPath) {
    // Update existing config
    const raw = readFileSync(configPath, "utf-8");
    const config = JSON.parse(raw);

    if (!config.plugins) config.plugins = {};
    if (!config.plugins.entries) config.plugins.entries = {};
    if (!config.plugins.entries.clawnitor) config.plugins.entries.clawnitor = {};
    if (!config.plugins.entries.clawnitor.config)
      config.plugins.entries.clawnitor.config = {};

    config.plugins.entries.clawnitor.config.apiKey = apiKey;

    writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");
    return configPath;
  }

  // Create new config
  const newPath = join(process.cwd(), CONFIG_FILE);
  const config = {
    plugins: {
      entries: {
        clawnitor: {
          config: {
            apiKey: apiKey,
          },
        },
      },
    },
  };

  writeFileSync(newPath, JSON.stringify(config, null, 2) + "\n");
  return newPath;
}

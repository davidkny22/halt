#!/usr/bin/env node

import { init } from "./init.js";
import { test } from "./test.js";
import { check } from "./check.js";
import { discover } from "./discover.js";

const command = process.argv[2];

if (command === "init") {
  init().catch((err) => {
    console.error("\n  Error:", err.message);
    process.exit(1);
  });
} else if (command === "test") {
  test().catch((err) => {
    console.error("\n  Error:", err.message);
    process.exit(1);
  });
} else if (command === "check") {
  check().catch((err) => {
    console.error("\n  Error:", err.message);
    process.exit(1);
  });
} else if (command === "discover") {
  discover().catch((err) => {
    console.error("\n  Error:", err.message);
    process.exit(1);
  });
} else {
  console.log(`
  Clawnitor CLI — Agent monitoring for OpenClaw

  Commands:
    init      Set up Clawnitor (authenticate + configure API key)
    discover  Register all agents from openclaw.json with Clawnitor
    test      Test Shield config and rules against synthetic attacks
    check     Quick Shield reliability score (one line)

  Usage:
    npx clawnitor init
    npx clawnitor discover           # register all agents
    npx clawnitor test               # fetch rules from API
    npx clawnitor test --verbose     # detailed output
    npx clawnitor test --json        # machine-readable
    npx clawnitor check              # one-line reliability score
`);
}

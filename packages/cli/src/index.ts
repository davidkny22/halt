#!/usr/bin/env node

import { init } from "./init.js";

const command = process.argv[2];

if (command === "init") {
  init().catch((err) => {
    console.error("\n  Error:", err.message);
    process.exit(1);
  });
} else {
  console.log(`
  Clawnitor CLI — Agent monitoring for OpenClaw

  Commands:
    init    Set up Clawnitor (authenticate + configure API key)

  Usage:
    npx clawnitor init
`);
}

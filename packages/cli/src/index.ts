#!/usr/bin/env node

import { init } from "./init.js";
import { test } from "./test.js";
import { check } from "./check.js";
import { discover } from "./discover.js";
import { report } from "./report.js";

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
} else if (command === "report") {
  report().catch((err) => {
    console.error("\n  Error:", err.message);
    process.exit(1);
  });
} else if (command === "serve") {
  import("./serve.js").then((m) => m.serve()).catch((err) => {
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
    report    View local event summary (offline mode)
    serve     Start local dashboard on localhost (offline mode)

  Usage:
    npx clawnitor init
    npx clawnitor discover           # register all agents
    npx clawnitor test               # fetch rules from API
    npx clawnitor test --verbose     # detailed output
    npx clawnitor test --json        # machine-readable
    npx clawnitor check              # one-line reliability score
    npx clawnitor report             # local event summary
    npx clawnitor serve              # local dashboard on localhost:5173
`);
}

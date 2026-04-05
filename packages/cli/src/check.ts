/**
 * `halt check` — zero-config quick Shield reliability check.
 * One command, one number.
 */

import { runTests, formatJson } from "./test-runner.js";

const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";

export async function check() {
  const json = process.argv.includes("--json");

  const score = await runTests();

  if (json) {
    console.log(JSON.stringify({
      reliability: Math.round(score.reliability * 1000) / 10,
      risk: score.risk,
      deploy: score.deploy,
      gaps: score.gaps.length,
    }));
  } else {
    const color = score.risk === "SAFE" || score.risk === "LOW" ? GREEN : score.risk === "MEDIUM" ? YELLOW : RED;
    const bar = "\u2588".repeat(Math.round(score.reliability * 20)) + "\u2591".repeat(20 - Math.round(score.reliability * 20));

    console.log("");
    console.log(`  ${BOLD}Shield${RESET}  ${bar}  ${color}${Math.round(score.reliability * 1000) / 10}%${RESET}  ${color}${score.risk}${RESET}  ${score.gaps.length > 0 ? `${YELLOW}${score.gaps.length} gap${score.gaps.length > 1 ? "s" : ""}${RESET}` : `${GREEN}no gaps${RESET}`}`);
    console.log("");
  }

  if (score.deploy === "BLOCK") process.exit(1);
}

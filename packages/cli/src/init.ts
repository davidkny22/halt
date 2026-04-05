import { createInterface } from "node:readline";
import { githubDeviceAuth, getGitHubEmail } from "./auth/github-device.js";
import { sendMagicLink, pollMagicLink } from "./auth/magic-link.js";
import { writeApiKey } from "./config.js";

const API_URL = process.env.CLAWNITOR_API_URL || "https://api.clawnitor.io";

function ask(question: string): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer: string) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function provisionAndGetKey(email: string): Promise<string> {
  // Provision user (creates account if new)
  const provisionRes = await fetch(`${API_URL}/api/auth/cli-provision`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  if (!provisionRes.ok) {
    const data = await provisionRes.json().catch(() => ({}));
    throw new Error(
      (data as { error?: string }).error || "Failed to provision account"
    );
  }

  const { apiKey } = (await provisionRes.json()) as { apiKey: string };
  return apiKey;
}

export async function init() {
  console.log(`
  Clawnitor — Agent monitoring for OpenClaw
  by Safer Intelligence Labs
`);

  const method = await ask(
    "  How do you want to sign in?\n  1. GitHub\n  2. Email magic link\n\n  > "
  );

  let email: string;

  if (method === "1" || method.toLowerCase() === "github") {
    // GitHub device flow
    const githubToken = await githubDeviceAuth();
    email = await getGitHubEmail(githubToken);
    console.log(`\n  Authenticated as ${email}`);
  } else if (
    method === "2" ||
    method.toLowerCase() === "email" ||
    method.toLowerCase() === "magic"
  ) {
    // Magic link flow
    email = await ask("\n  Email: ");
    if (!email || !email.includes("@")) {
      throw new Error("Invalid email");
    }

    const pollingToken = await sendMagicLink(email);
    const result = await pollMagicLink(pollingToken);
    email = result.email;
    console.log(`\n  Authenticated as ${email}`);
  } else {
    throw new Error('Pick 1 or 2');
  }

  // Provision account and get API key
  console.log("\n  Generating API key...");
  const apiKey = await provisionAndGetKey(email);

  // Write to config
  console.log("  Writing to openclaw.json...");
  const configPath = writeApiKey(apiKey);

  console.log(`
  Done. Clawnitor is monitoring your agents.

  Config:     ${configPath}
  Dashboard:  https://app.clawnitor.io
  Docs:       https://clawnitor.io/docs
`);
}

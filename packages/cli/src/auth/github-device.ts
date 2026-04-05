const GITHUB_CLIENT_ID = "Ov23liNYdX5tPiHxNqx5";

interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

interface TokenResponse {
  access_token?: string;
  error?: string;
}

export async function githubDeviceAuth(): Promise<string> {
  // Step 1: Request device code
  const codeRes = await fetch("https://github.com/login/device/code", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: GITHUB_CLIENT_ID,
      scope: "user:email",
    }),
  });

  if (!codeRes.ok) throw new Error("Failed to start GitHub device flow");

  const codeData: DeviceCodeResponse = await codeRes.json();

  console.log(`
  Open this URL:  ${codeData.verification_uri}
  Enter code:     ${codeData.user_code}
`);
  console.log("  Waiting for authorization...");

  // Step 2: Poll for token
  const interval = (codeData.interval || 5) * 1000;
  const deadline = Date.now() + codeData.expires_in * 1000;

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, interval));

    const tokenRes = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: GITHUB_CLIENT_ID,
          device_code: codeData.device_code,
          grant_type: "urn:ietf:params:oauth:grant-type:device_code",
        }),
      }
    );

    const tokenData: TokenResponse = await tokenRes.json();

    if (tokenData.access_token) {
      return tokenData.access_token;
    }

    if (
      tokenData.error === "authorization_pending" ||
      tokenData.error === "slow_down"
    ) {
      continue;
    }

    if (tokenData.error) {
      throw new Error(`GitHub auth failed: ${tokenData.error}`);
    }
  }

  throw new Error("GitHub authorization timed out");
}

export async function getGitHubEmail(token: string): Promise<string> {
  const res = await fetch("https://api.github.com/user/emails", {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
    },
  });

  if (!res.ok) throw new Error("Failed to get GitHub email");

  const emails: { email: string; primary: boolean }[] = await res.json();
  const primary = emails.find((e) => e.primary);
  if (!primary) throw new Error("No primary email found on GitHub account");

  return primary.email;
}

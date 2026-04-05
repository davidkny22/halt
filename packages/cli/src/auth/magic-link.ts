const API_URL = process.env.CLAWNITOR_API_URL || "https://api.clawnitor.io";

export async function sendMagicLink(email: string): Promise<string> {
  const res = await fetch(`${API_URL}/api/auth/cli-magic-link`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      (data as { error?: string }).error || "Failed to send magic link"
    );
  }

  const data: { token: string } = await res.json();
  return data.token; // polling token
}

export async function pollMagicLink(
  pollingToken: string
): Promise<{ email: string; sessionToken: string }> {
  const deadline = Date.now() + 5 * 60_000; // 5 min timeout

  console.log("  Check your email and click the link.\n");
  console.log("  Waiting...");

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 3000));

    const res = await fetch(`${API_URL}/api/auth/cli-magic-link/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: pollingToken }),
    });

    if (!res.ok) continue;

    const data: { verified: boolean; email?: string; sessionToken?: string } =
      await res.json();

    if (data.verified && data.email && data.sessionToken) {
      return { email: data.email, sessionToken: data.sessionToken };
    }
  }

  throw new Error("Magic link timed out. Try again.");
}

const API_URL = process.env.HALT_API_URL || "https://api.halt.dev";

export async function sendMagicLink(email: string): Promise<string> {
  const res = await fetch(`${API_URL}/api/auth/cli-magic-link`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error || "Failed to send magic link");
  }

  const { token } = (await res.json()) as { token: string };
  return token;
}

export async function pollMagicLink(
  token: string,
  timeoutMs: number = 5 * 60 * 1000
): Promise<{ email: string }> {
  const start = Date.now();
  const interval = 3000; // 3 seconds

  while (Date.now() - start < timeoutMs) {
    const res = await fetch(`${API_URL}/api/auth/cli-magic-link/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    if (res.ok) {
      const data = (await res.json()) as { verified: boolean; email?: string; expired?: boolean };
      if (data.verified && data.email) {
        return { email: data.email };
      }
      if (data.expired) {
        throw new Error("Magic link expired. Run halt init again.");
      }
    }

    await new Promise((r) => setTimeout(r, interval));
  }

  throw new Error("Timed out waiting for email verification.");
}

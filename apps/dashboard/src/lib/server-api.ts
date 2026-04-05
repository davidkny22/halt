import { auth } from "@/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

async function getApiKey(): Promise<string | null> {
  const session = await auth();
  if (!session?.user?.email) return null;

  // Fetch the user's API key from the backend
  try {
    const res = await fetch(
      `${API_URL}/api/auth/me?email=${encodeURIComponent(session.user.email)}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    const data = await res.json();

    // If they don't have a key yet, provision one
    if (!data.has_key) {
      const provRes = await fetch(`${API_URL}/api/auth/provision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: session.user.email }),
      });
      if (provRes.ok) {
        const provData = await provRes.json();
        return provData.api_key || null;
      }
    }

    // We can't retrieve the raw key after creation, so for server-side
    // API calls we'll use email-based auth for now
    return null;
  } catch {
    return null;
  }
}

export async function serverFetch<T>(
  path: string,
  opts: RequestInit = {}
): Promise<T | null> {
  const session = await auth();
  if (!session?.user?.email) return null;

  // For server-side calls, use the internal provision endpoint
  // to get user data without needing the API key
  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...opts,
      headers: {
        "Content-Type": "application/json",
        ...opts.headers,
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function getUserInfo() {
  const session = await auth();
  if (!session?.user?.email) return null;

  try {
    const res = await fetch(
      `${API_URL}/api/auth/me?email=${encodeURIComponent(session.user.email)}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function getSession() {
  return auth();
}

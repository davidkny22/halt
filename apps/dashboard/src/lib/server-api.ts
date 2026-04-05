import { auth } from "@/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET || "";

function internalHeaders(email: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    "X-Internal-Secret": INTERNAL_SECRET,
    "X-User-Email": email,
  };
}

async function getEmail(): Promise<string | null> {
  const session = await auth();
  return session?.user?.email || null;
}

// Authenticated server-side fetch — uses internal secret + user email
export async function serverFetch<T>(
  path: string,
  opts: RequestInit = {}
): Promise<T | null> {
  const email = await getEmail();
  if (!email) return null;

  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...opts,
      headers: {
        ...internalHeaders(email),
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
  const email = await getEmail();
  if (!email) return null;

  try {
    const res = await fetch(
      `${API_URL}/api/auth/me?email=${encodeURIComponent(email)}`,
      {
        cache: "no-store",
        headers: {
          "X-Internal-Secret": INTERNAL_SECRET,
          "X-User-Email": email,
        },
      }
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function getAgents() {
  return serverFetch<{ agents: any[] }>("/api/agents");
}

export async function getRules() {
  return serverFetch<{ rules: any[] }>("/api/rules");
}

export async function getAlerts() {
  return serverFetch<{ alerts: any[] }>("/api/alerts");
}

export async function getEvents(limit = 50) {
  return serverFetch<{ events: any[] }>(`/api/events?limit=${limit}`);
}

export async function getStats() {
  return serverFetch<{
    events_today: number;
    alerts_today: number;
    spend_today: number;
    agents_active: number;
  }>("/api/stats");
}

export async function getTeam() {
  return serverFetch<{
    team: any;
    members: any[];
    agents: any[];
    shared_rules: any[];
    agent_count: number;
    max_agents: number;
  } | { team: null }>("/api/teams");
}

export async function getAlertChannels() {
  return serverFetch<{ channels: any[] }>("/api/account/alert-channels");
}

export async function getSavesCount() {
  return serverFetch<{ count: number }>("/api/saves/count");
}

export async function getSaves(limit = 20) {
  return serverFetch<{ saves: any[] }>(`/api/saves?limit=${limit}`);
}

export async function getSpend(days = 7) {
  return serverFetch<{
    period_days: number;
    total: { cost: number; tokens: number; events: number };
    by_agent: {
      agent_id: string;
      agent_name: string | null;
      cost: number;
      tokens: number;
      event_count: number;
    }[];
    by_day: { day: string; cost: number; tokens: number; event_count: number }[];
    by_session: {
      session_id: string;
      agent_name: string | null;
      cost: number;
      tokens: number;
      event_count: number;
      started: string;
      ended: string;
    }[];
    by_model: {
      model: string;
      cost: number;
      tokens: number;
      event_count: number;
    }[];
    by_tool: {
      tool_name: string;
      cost: number;
      tokens: number;
      event_count: number;
    }[];
    top_events: {
      id: string;
      event_type: string;
      action: string;
      target: string;
      cost: number;
      tokens: number;
      model: string | null;
      timestamp: string;
      agent_name: string | null;
    }[];
  }>(`/api/spend?days=${days}`);
}

export async function getSession() {
  return auth();
}

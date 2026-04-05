import { auth } from "@/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET || "";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { action, ...data } = body;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    "X-Internal-Secret": INTERNAL_SECRET,
    "X-User-Email": session.user.email,
  };

  if (action === "update-auto-kill") {
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_RE.test(data.agentId)) {
      return Response.json({ error: "Invalid agent ID" }, { status: 400 });
    }
    const res = await fetch(`${API_URL}/api/agents/${data.agentId}/auto-kill`, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        enabled: data.enabled,
        threshold: data.threshold,
        windowMinutes: data.windowMinutes,
      }),
    });
    return Response.json(await res.json(), { status: res.status });
  }

  if (action === "get-agent-config") {
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_RE.test(data.agentId)) {
      return Response.json({ error: "Invalid agent ID" }, { status: 400 });
    }
    const res = await fetch(`${API_URL}/api/agents/${data.agentId}/config`, {
      method: "GET",
      headers,
    });
    return Response.json(await res.json(), { status: res.status });
  }

  if (action === "activate") {
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_RE.test(data.agentId)) {
      return Response.json({ error: "Invalid agent ID" }, { status: 400 });
    }
    const res = await fetch(`${API_URL}/api/agents/${data.agentId}/activate`, {
      method: "PUT",
      headers,
      body: JSON.stringify({}),
    });
    return Response.json(await res.json(), { status: res.status });
  }

  if (action === "get-tools") {
    const res = await fetch(`${API_URL}/api/tools`, {
      method: "GET",
      headers,
    });
    return Response.json(await res.json(), { status: res.status });
  }

  if (action === "get-sessions") {
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_RE.test(data.agentId)) {
      return Response.json({ error: "Invalid agent ID" }, { status: 400 });
    }
    // Use real sessions table
    const res = await fetch(`${API_URL}/api/sessions?agent_id=${data.agentId}&limit=20`, {
      method: "GET",
      headers,
    });
    return Response.json(await res.json(), { status: res.status });
  }

  if (action === "get-session-events") {
    // Get events for a specific session (for expanding traces)
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_RE.test(data.agentId)) {
      return Response.json({ error: "Invalid agent ID" }, { status: 400 });
    }
    const res = await fetch(`${API_URL}/api/agents/${data.agentId}/sessions`, {
      method: "GET",
      headers,
    });
    const result = await res.json();
    // Filter to the requested session
    if (data.sessionId && result.sessions) {
      const match = result.sessions.find((s: any) => s.session_id === data.sessionId);
      return Response.json({ events: match?.events || [] }, { status: 200 });
    }
    return Response.json(result, { status: res.status });
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
}

import { auth } from "@/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET || "";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { action } = body;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    "X-Internal-Secret": INTERNAL_SECRET,
    "X-User-Email": session.user.email,
  };

  if (action === "get-audit-logs") {
    const res = await fetch(`${API_URL}/api/audit-logs`, { headers });
    return Response.json(await res.json(), { status: res.status });
  }

  if (action === "get-webhooks") {
    const res = await fetch(`${API_URL}/api/webhooks`, { headers });
    return Response.json(await res.json(), { status: res.status });
  }

  if (action === "get-sso") {
    const res = await fetch(`${API_URL}/api/sso`, { headers });
    return Response.json(await res.json(), { status: res.status });
  }

  if (action === "create-webhook") {
    const res = await fetch(`${API_URL}/api/webhooks`, {
      method: "POST",
      headers,
      body: JSON.stringify({ name: body.name, url: body.url, events: body.events }),
    });
    return Response.json(await res.json(), { status: res.status });
  }

  if (action === "delete-webhook") {
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_RE.test(body.webhookId)) {
      return Response.json({ error: "Invalid webhook ID" }, { status: 400 });
    }
    const res = await fetch(`${API_URL}/api/webhooks/${body.webhookId}`, {
      method: "DELETE",
      headers,
    });
    return Response.json(await res.json(), { status: res.status });
  }

  if (action === "configure-sso") {
    const res = await fetch(`${API_URL}/api/sso`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        provider: body.provider,
        issuer_url: body.issuerUrl,
        client_id: body.clientId,
        client_secret: body.clientSecret,
      }),
    });
    return Response.json(await res.json(), { status: res.status });
  }

  if (action === "toggle-sso") {
    const res = await fetch(`${API_URL}/api/sso/toggle`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ enabled: body.enabled }),
    });
    return Response.json(await res.json(), { status: res.status });
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
}

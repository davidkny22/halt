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

  if (action === "toggle-data-sharing") {
    const res = await fetch(`${API_URL}/api/account/data-sharing`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ enabled: data.enabled }),
    });
    return Response.json(await res.json(), { status: res.status });
  }

  if (action === "rotate-key") {
    const res = await fetch(`${API_URL}/api/account/rotate-key`, {
      method: "POST",
      headers,
      body: JSON.stringify({}),
    });
    return Response.json(await res.json(), { status: res.status });
  }

  if (action === "list-keys") {
    const res = await fetch(`${API_URL}/api/account/keys`, {
      method: "GET",
      headers,
    });
    return Response.json(await res.json(), { status: res.status });
  }

  if (action === "create-key") {
    const res = await fetch(`${API_URL}/api/account/keys`, {
      method: "POST",
      headers,
      body: JSON.stringify({ name: data.name }),
    });
    return Response.json(await res.json(), { status: res.status });
  }

  if (action === "rename-key") {
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_RE.test(data.keyId)) {
      return Response.json({ error: "Invalid key ID" }, { status: 400 });
    }
    const res = await fetch(`${API_URL}/api/account/keys/${data.keyId}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ name: data.name }),
    });
    return Response.json(await res.json(), { status: res.status });
  }

  if (action === "revoke-key") {
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_RE.test(data.keyId)) {
      return Response.json({ error: "Invalid key ID" }, { status: 400 });
    }
    const res = await fetch(`${API_URL}/api/account/keys/${data.keyId}`, {
      method: "DELETE",
      headers,
    });
    return Response.json(await res.json(), { status: res.status });
  }

  if (action === "delete-account") {
    const res = await fetch(`${API_URL}/api/account`, {
      method: "DELETE",
      headers,
    });
    return Response.json(await res.json(), { status: res.status });
  }

  if (action === "checkout") {
    const res = await fetch(`${API_URL}/api/billing/checkout`, {
      method: "POST",
      headers,
      body: JSON.stringify({ plan: data.plan || "pro" }),
    });
    return Response.json(await res.json(), { status: res.status });
  }

  if (action === "start-trial") {
    const res = await fetch(`${API_URL}/api/billing/start-trial`, {
      method: "POST",
      headers,
      body: JSON.stringify({}),
    });
    return Response.json(await res.json(), { status: res.status });
  }

  if (action === "get-alert-channels") {
    const res = await fetch(`${API_URL}/api/account/alert-channels`, {
      method: "GET",
      headers,
    });
    return Response.json(await res.json(), { status: res.status });
  }

  if (action === "save-alert-channel") {
    const ALLOWED_CHANNELS = ["telegram", "discord", "sms"];
    if (!ALLOWED_CHANNELS.includes(data.channel)) {
      return Response.json({ error: "Invalid channel" }, { status: 400 });
    }
    const res = await fetch(`${API_URL}/api/account/alert-channels/${data.channel}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ config: data.config, enabled: data.enabled ?? true }),
    });
    return Response.json(await res.json(), { status: res.status });
  }

  if (action === "remove-alert-channel") {
    const ALLOWED_CHANNELS = ["telegram", "discord", "sms"];
    if (!ALLOWED_CHANNELS.includes(data.channel)) {
      return Response.json({ error: "Invalid channel" }, { status: 400 });
    }
    const res = await fetch(`${API_URL}/api/account/alert-channels/${data.channel}`, {
      method: "DELETE",
      headers,
    });
    return Response.json(await res.json(), { status: res.status });
  }

  if (action === "redeem-beta-code") {
    const res = await fetch(`${API_URL}/api/beta/redeem`, {
      method: "POST",
      headers,
      body: JSON.stringify({ code: data.code }),
    });
    return Response.json(await res.json(), { status: res.status });
  }

  if (action === "beta-status") {
    const res = await fetch(`${API_URL}/api/beta/status`, {
      method: "GET",
      headers,
    });
    return Response.json(await res.json(), { status: res.status });
  }

  if (action === "submit-feedback") {
    const res = await fetch(`${API_URL}/api/feedback`, {
      method: "POST",
      headers,
      body: JSON.stringify({ message: data.message, page: data.page }),
    });
    return Response.json(await res.json(), { status: res.status });
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
}

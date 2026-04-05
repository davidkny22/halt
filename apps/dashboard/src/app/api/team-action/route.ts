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

  if (action === "create") {
    const res = await fetch(`${API_URL}/api/teams`, {
      method: "POST",
      headers,
      body: JSON.stringify({ name: data.name }),
    });
    return Response.json(await res.json(), { status: res.status });
  }

  if (action === "invite") {
    const res = await fetch(`${API_URL}/api/teams/${data.teamId}/invite`, {
      method: "POST",
      headers,
      body: JSON.stringify({ email: data.email, role: data.role || "editor" }),
    });
    return Response.json(await res.json(), { status: res.status });
  }

  if (action === "accept-invite") {
    const res = await fetch(`${API_URL}/api/teams/accept-invite`, {
      method: "POST",
      headers,
      body: JSON.stringify({ token: data.token }),
    });
    return Response.json(await res.json(), { status: res.status });
  }

  if (action === "remove-member") {
    const res = await fetch(`${API_URL}/api/teams/${data.teamId}/members/${data.memberId}`, {
      method: "DELETE",
      headers,
    });
    return Response.json(await res.json(), { status: res.status });
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
}

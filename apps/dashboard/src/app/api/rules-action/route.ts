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
    const res = await fetch(`${API_URL}/api/rules`, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    });
    const result = await res.json();
    return Response.json(result, { status: res.status });
  }

  if (action === "delete") {
    const res = await fetch(`${API_URL}/api/rules/${data.ruleId}`, {
      method: "DELETE",
      headers,
    });
    const result = await res.json();
    return Response.json(result, { status: res.status });
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
}

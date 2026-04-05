const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    path: string,
    opts: RequestInit = {}
  ): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...opts,
      headers: {
        "Content-Type": "application/json",
        ...opts.headers,
      },
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(error.message || `API error: ${res.status}`);
    }

    return res.json();
  }

  // Auth
  async signup(email: string, password: string) {
    return this.request("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  async login(email: string, password: string) {
    return this.request<{ token: string; user: any }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  // Authenticated requests (pass API key or session token)
  private authHeaders(token: string): HeadersInit {
    return { Authorization: `Bearer ${token}` };
  }

  async getAgents(token: string) {
    return this.request<{ agents: any[] }>("/api/agents", {
      headers: this.authHeaders(token),
    });
  }

  async getEvents(token: string, params?: { limit?: number; offset?: number }) {
    const query = new URLSearchParams();
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.offset) query.set("offset", String(params.offset));
    const qs = query.toString() ? `?${query}` : "";
    return this.request<{ events: any[] }>(`/api/events${qs}`, {
      headers: this.authHeaders(token),
    });
  }

  async getRules(token: string) {
    return this.request<{ rules: any[] }>("/api/rules", {
      headers: this.authHeaders(token),
    });
  }

  async createRule(token: string, data: { name: string; config: any }) {
    return this.request("/api/rules", {
      method: "POST",
      headers: this.authHeaders(token),
      body: JSON.stringify(data),
    });
  }

  async deleteRule(token: string, ruleId: string) {
    return this.request(`/api/rules/${ruleId}`, {
      method: "DELETE",
      headers: this.authHeaders(token),
    });
  }

  async getAlerts(token: string) {
    return this.request<{ alerts: any[] }>("/api/alerts", {
      headers: this.authHeaders(token),
    });
  }

  async killAgent(token: string, agentId: string, reason?: string) {
    return this.request(`/api/agents/${agentId}/kill`, {
      method: "POST",
      headers: this.authHeaders(token),
      body: JSON.stringify({ reason }),
    });
  }

  async resumeAgent(token: string, agentId: string) {
    return this.request(`/api/agents/${agentId}/resume`, {
      method: "POST",
      headers: this.authHeaders(token),
    });
  }
}

export const api = new ApiClient(API_URL);

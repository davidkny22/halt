import type { ClawnitorEvent } from "./events.js";

export interface KillState {
  killed: boolean;
  reason?: string;
}

export interface IngestEventsRequest {
  events: ClawnitorEvent[];
}

export interface IngestEventsResponse {
  accepted: number;
  kill_state: KillState;
}

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}

export interface AgentResponse {
  id: string;
  user_id: string;
  name: string;
  agent_id: string;
  status: "active" | "learning" | "paused";
  created_at: string;
}

export interface CreateAgentRequest {
  name: string;
  agent_id: string;
}

export interface StatsResponse {
  events_today: number;
  alerts_today: number;
  spend_today: number;
  agents_active: number;
}

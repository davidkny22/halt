export interface KillMessage {
  type: "kill";
  reason: string;
  rule_id?: string;
  agent_id?: string; // Per-agent kill (omitted = global)
}

export interface UnkillMessage {
  type: "unkill";
  agent_id?: string; // Per-agent resume (omitted = global)
}

export type WsMessage = KillMessage | UnkillMessage;

export interface KillState {
  killed: boolean;
  reason?: string;
  killed_at?: string;
}

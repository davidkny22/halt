export interface KillMessage {
  type: "kill";
  reason: string;
  rule_id?: string;
}

export interface UnkillMessage {
  type: "unkill";
}

export type WsMessage = KillMessage | UnkillMessage;

export interface KillState {
  killed: boolean;
  reason?: string;
  killed_at?: string;
}

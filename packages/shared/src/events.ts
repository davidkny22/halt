import { z } from "zod";
import { uuidv7 } from "uuidv7";

export const EVENT_TYPES = [
  "tool_use",
  "llm_call",
  "message_sent",
  "message_received",
  "agent_lifecycle",
  "subagent",
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export const SEVERITY_HINTS = ["normal", "elevated", "critical"] as const;
export type SeverityHint = (typeof SEVERITY_HINTS)[number];

export const eventMetadataSchema = z.object({
  cost_usd: z.number().optional(),
  tokens_used: z.number().int().optional(),
  tool_name: z.string().optional(),
  duration_ms: z.number().optional(),
  error: z.string().optional(),
  raw_snippet: z.string().max(500).optional(),
  subagent_id: z.string().optional(),
  shield_detection: z.boolean().optional(),
  shield_category: z.string().optional(),
  shield_severity: z.string().optional(),
  shield_patterns: z.array(z.string()).optional(),
});

export type EventMetadata = z.infer<typeof eventMetadataSchema>;

export const clawnitorEventSchema = z.object({
  agent_id: z.string().min(1),
  session_id: z.string().min(1),
  timestamp: z.string().datetime(),
  event_type: z.enum(EVENT_TYPES),
  action: z.string(),
  target: z.string(),
  metadata: eventMetadataSchema,
  severity_hint: z.enum(SEVERITY_HINTS),
  event_id: z.string().uuid(),
  plugin_version: z.string(),
});

export type ClawnitorEvent = z.infer<typeof clawnitorEventSchema>;

export function createEventId(): string {
  return uuidv7();
}

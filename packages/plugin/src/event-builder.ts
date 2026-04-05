import { createEventId, type ClawnitorEvent, type EventType, type SeverityHint } from "@clawnitor/shared";
import { assignSeverity, type RateTracker } from "./severity.js";
import { redact, DEFAULT_PATTERNS } from "./redaction.js";

const PLUGIN_VERSION = "0.0.1";

interface BuildEventParams {
  agentId: string;
  sessionId: string;
  eventType: EventType;
  action: string;
  target: string;
  metadata?: Record<string, unknown>;
  rateTracker?: RateTracker;
  customRedactionPatterns?: string[];
}

export function buildEvent(params: BuildEventParams): ClawnitorEvent {
  const {
    agentId,
    sessionId,
    eventType,
    action,
    target,
    metadata = {},
    rateTracker,
    customRedactionPatterns = [],
  } = params;

  // Redact sensitive data from raw_snippet
  const patterns = [...DEFAULT_PATTERNS, ...customRedactionPatterns];
  const cleaned: Record<string, unknown> = { ...metadata };
  if (typeof cleaned.raw_snippet === "string") {
    cleaned.raw_snippet = redact(cleaned.raw_snippet, patterns);
    // Truncate to 500 chars
    if ((cleaned.raw_snippet as string).length > 500) {
      cleaned.raw_snippet = (cleaned.raw_snippet as string).slice(0, 500);
    }
  }

  const severity = assignSeverity(
    eventType,
    cleaned,
    rateTracker
  );

  // Redact action and target fields too
  const redactedAction = redact(action, patterns);
  const redactedTarget = redact(target, patterns);

  return {
    agent_id: agentId,
    session_id: sessionId,
    timestamp: new Date().toISOString(),
    event_type: eventType,
    action: redactedAction,
    target: redactedTarget,
    metadata: cleaned as any,
    severity_hint: severity,
    event_id: createEventId(),
    plugin_version: PLUGIN_VERSION,
  };
}

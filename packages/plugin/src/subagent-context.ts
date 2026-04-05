/**
 * Detect subagent context from OpenClaw hook events.
 *
 * OpenClaw hooks fire globally (main + subagents). When running in a subagent
 * context, the event's sessionKey contains "subagent:" — e.g.
 * "agent:my-agent:subagent:abc-123".
 *
 * This module extracts subagent identity so all events carry attribution.
 */

const SUBAGENT_PATTERN = /subagent:([^:]+)$/;

export interface SubagentInfo {
  /** The session ID to use (event's sessionKey if available, fallback to parent) */
  sessionId: string;
  /** The subagent ID if running in subagent context, undefined otherwise */
  subagentId: string | undefined;
  /** Whether this event is from a subagent */
  isSubagent: boolean;
}

/**
 * Extract subagent context from an OpenClaw hook event.
 * @param event The raw hook event from OpenClaw
 * @param fallbackSessionId The parent session ID to use if event has no sessionKey
 */
export function getSubagentInfo(event: any, fallbackSessionId: string): SubagentInfo {
  const sessionKey: string | undefined = event?.sessionKey;

  if (!sessionKey) {
    return { sessionId: fallbackSessionId, subagentId: undefined, isSubagent: false };
  }

  const match = sessionKey.match(SUBAGENT_PATTERN);
  if (match) {
    return {
      sessionId: sessionKey,
      subagentId: match[1],
      isSubagent: true,
    };
  }

  return { sessionId: sessionKey, subagentId: undefined, isSubagent: false };
}

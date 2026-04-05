import { NextRequest, NextResponse } from "next/server";
import { SCENARIO_PROMPTS } from "@/app/demo/scenarios";
import type { DemoRule, DemoEvent } from "@/app/demo/demo-types";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Response cache: scenario+rules hash → cached events (rotate through)
const responseCache = new Map<string, { events: DemoEvent[][]; lastUsed: number }>();
const CACHE_TTL_MS = 5 * 60_000; // 5 min

function getCacheKey(scenario: string, rules: DemoRule[]): string {
  const rulesSig = rules
    .filter((r) => r.enabled)
    .map((r) => `${r.id}:${r.config.type}`)
    .sort()
    .join("|");
  return `${scenario}:${rulesSig}`;
}

// In-memory rate limiting
const ipMinuteCounts = new Map<string, { count: number; reset: number }>();
const ipDayCounts = new Map<string, { count: number; reset: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();

  // Per-minute check (30/min — most polls hit cache, not AI)
  const minute = ipMinuteCounts.get(ip);
  if (!minute || now > minute.reset) {
    ipMinuteCounts.set(ip, { count: 1, reset: now + 60_000 });
  } else {
    minute.count++;
    if (minute.count > 30) return false;
  }

  // Per-day check (100/day)
  const day = ipDayCounts.get(ip);
  if (!day || now > day.reset) {
    ipDayCounts.set(ip, { count: 1, reset: now + 86_400_000 });
  } else {
    day.count++;
    if (day.count > 100) return false;
  }

  return true;
}

function formatRulesForPrompt(rules: DemoRule[]): string {
  return rules
    .filter((r) => r.enabled)
    .map((r) => {
      const c = r.config;
      switch (c.type) {
        case "threshold":
          return `- "${r.name}": Block if ${c.field} ${c.operator === "gt" ? "exceeds" : "is below"} ${c.value} within ${c.windowMinutes} minutes`;
        case "rate":
          return `- "${r.name}": Block if more than ${c.maxCount} ${c.toolName || c.eventType || "events"} within ${c.windowMinutes} minutes`;
        case "keyword":
          return `- "${r.name}": Block if any of these appear: ${c.keywords.join(", ")}`;
        default:
          return `- "${r.name}"`;
      }
    })
    .join("\n");
}

export async function POST(request: NextRequest) {
  if (!OPENAI_API_KEY) {
    return NextResponse.json({ error: "AI not configured" }, { status: 503 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const body = await request.json();
  const { scenario, rules, history } = body as {
    scenario: string;
    rules: DemoRule[];
    history: DemoEvent[];
  };

  const scenarioPrompt = SCENARIO_PROMPTS[scenario] || SCENARIO_PROMPTS.custom;
  const rulesText = formatRulesForPrompt(rules);

  const historyText = history.length > 0
    ? `\n\nRecent events you already generated (continue from here, don't repeat):\n${history.map((e) => `  ${e.event_type}: ${e.action} → ${e.target}`).join("\n")}`
    : "";

  const systemPrompt = `${scenarioPrompt}

RULES THE MONITORING SYSTEM HAS SET (you must try to violate these):
${rulesText || "(no rules set)"}

YOUR MISSION: Generate exactly 5 events. At least 2 of the 5 MUST violate the rules above. The violations must contain the EXACT keywords or exceed the EXACT thresholds listed in the rules. Do not be subtle — if a keyword rule blocks "rm -rf", generate an event with "rm -rf" in the action or target field. If a rate rule limits email.send, generate multiple email.send events.

${rules.length === 0 ? "Since no rules are set, just generate normal agent activity." : "You MUST violate the rules. This is critical."}

Respond with ONLY valid JSON in this exact format:
{
  "events": [
    {
      "id": "evt_<random_4_chars>",
      "event_type": "tool_use",
      "action": "email.send",
      "target": "user@example.com",
      "agent_name": "${SCENARIO_PROMPTS[scenario] ? scenario.replace(/-/g, " ").split(" ").map((w: string) => w === "rogue" ? "email" : w).join("-") : "assistant"}",
      "timestamp": "${new Date().toISOString()}",
      "metadata": { "recipient_count": 5, "subject": "Weekly update" }
    }
  ]
}

Event types: tool_use, llm_call, message_sent, agent_lifecycle
For tool_use: action should be like "email.send", "file.delete", "bash.exec", "api.call", "file.write", "file.read"
For llm_call: include metadata.model (e.g. "gpt-4o-mini"), metadata.tokens, metadata.cost_usd
For keyword rule violations: make sure the blocked keywords appear in action, target, or metadata fields
For rate violations: generate multiple events of the same type rapidly
For threshold violations: include metadata with the tracked field (e.g. cost_usd, email_count) with high values${historyText}`;

  // Check cache first — serve cached batches for same scenario+rules combo
  const cacheKey = getCacheKey(scenario, rules);
  const cached = responseCache.get(cacheKey);
  if (cached && Date.now() - cached.lastUsed < CACHE_TTL_MS && cached.events.length > 0) {
    const batch = cached.events.shift()!;
    cached.lastUsed = Date.now();
    if (cached.events.length === 0) responseCache.delete(cacheKey);
    return NextResponse.json({ events: batch });
  }

  try {
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-5-nano",
        input: [
          { role: "developer", content: systemPrompt },
          { role: "user", content: "Generate the next batch of events." },
        ],
        reasoning: { effort: "minimal" },
        text: { format: { type: "json_object" }, verbosity: "low" },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("OpenAI API error:", res.status, text);
      return NextResponse.json({ error: "AI provider error" }, { status: 502 });
    }

    const data = await res.json();
    // Responses API: output is array, find the message block
    const msgBlock = data.output?.find((o: any) => o.type === "message");
    const content = msgBlock?.content?.[0]?.text;
    if (!content) {
      return NextResponse.json({ error: "Empty AI response" }, { status: 502 });
    }

    const parsed = JSON.parse(content);
    const allEvents: DemoEvent[] = (parsed.events || []).map((e: DemoEvent) => ({
      ...e,
      id: e.id || `evt_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: e.timestamp || new Date().toISOString(),
      agent_name: e.agent_name || scenario,
      metadata: e.metadata || {},
    }));

    // Return first event, cache the rest as individual batches for drip-feed
    const [first, ...rest] = allEvents;
    if (rest.length > 0) {
      responseCache.set(cacheKey, {
        events: rest.map((e) => [e]), // one event per cached batch
        lastUsed: Date.now(),
      });
    }

    return NextResponse.json({ events: first ? [first] : [] });
  } catch (err) {
    console.error("Demo agent error:", err);
    return NextResponse.json({ error: "Failed to generate events" }, { status: 500 });
  }
}

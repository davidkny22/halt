import type { FastifyInstance } from "fastify";
import { eq, desc } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { feedback } from "../db/schema.js";
import { authenticateAny, authenticateInternal } from "../auth/middleware.js";
import { logger } from "../util/logger.js";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

const CATEGORIZE_PROMPT = `You are the friendly support assistant for halt — an agent monitoring and safety product for OpenClaw.

YOUR KNOWLEDGE BASE:

Product Features:
- Real-time event capture: hooks into before_tool_call, after_tool_call, llm_input/output, messages, lifecycle. Zero config.
- Rules: 4 types — threshold (e.g., spend > $10/hr), rate (e.g., max 20 emails/5min), keyword (e.g., block "rm -rf"), natural language (describe in English, AI evaluates). Free tier gets 3 pattern rules. Pro gets unlimited pattern + 5 NL rules.
- Kill switch: 3-layer defense — server kill state (WebSocket, kill from anywhere), local failsafe (spend/rate/blocklist), cached rule evaluation. Auto-kill: agents automatically killed after repeated violations (configurable threshold + window, per-agent). Free tier: 1 manual kill/month. Pro: unlimited kills + auto-kill.
- AI anomaly detection: 72-hour behavioral baseline, flags deviations. Pro only.
- Alerts: email (all tiers), Telegram/Discord/SMS (Pro+). Configure in Settings.
- Dashboard: activity feed, stats with trends, spend chart, saves counter.
- Teams: Free gets 1 team (2 members). Pro: 3 members. Team tier: 10 members + shared rules.
- Demo: halt.dev/demo — try without signup.
- Docs: halt.dev/docs — full reference.

How To:
- Install: npm install @halt/plugin → add apiKey to openclaw.json
- Create rules: Dashboard → Rules → + Create Rule
- Kill an agent: Dashboard → Agents → Kill button
- Configure alerts: Settings → Alert Channels → Configure
- Upgrade: Settings → Upgrade to Pro (14-day free trial available)
- Rotate API key: Settings → Account → Rotate
- View saves: Dashboard → Saves (or shield icon in nav)

Pricing: Free ($0, 1 agent, 3 pattern rules, 1 kill/mo), Pro ($5/mo, 1 agent +$3/ea, up to 5 NL rules, AI detection), Team ($19/mo, 5 agents +$2/ea, 20 NL rules, 5-min eval), Enterprise (custom, unlimited).

YOUR TASK:
Given user feedback, respond with ONLY a JSON object (no markdown, no code fences, no explanation):

{"category":"bug|feature|frustration|praise|question|other","sentiment":"positive|neutral|negative","summary":"empathetic one-sentence summary under 20 words","reply":"a brief, warm, helpful response to the user (1-2 sentences max). If it's a question, answer it from your knowledge base. If it's a bug, acknowledge and say the team is on it. If it's praise, thank them genuinely. If it's a feature request, acknowledge and say it's logged. Never be robotic."}

Examples:
- "The kill switch didn't work" → {"category":"bug","sentiment":"negative","summary":"Kill switch failed to trigger — needs investigation","reply":"That shouldn't happen. Can you check you're on Pro tier? Free tier gets 1 kill/month. If you are on Pro, our team is looking into it."}
- "Love the demo page!" → {"category":"praise","sentiment":"positive","summary":"User loves the demo page","reply":"That means a lot — the demo was one of our favorite things to build. Thanks for checking it out!"}
- "Can I set up Telegram alerts?" → {"category":"question","sentiment":"neutral","summary":"User wants to configure Telegram alerts","reply":"Yes! Go to Settings → Alert Channels → Telegram → enter your bot token and chat ID. Needs Pro plan."}`;


async function categorizeFeedback(message: string): Promise<{ category: string; sentiment: string; summary: string; reply: string }> {
  if (!OPENAI_API_KEY) {
    return { category: "other", sentiment: "neutral", summary: message.slice(0, 100), reply: "Thanks! We got your feedback." };
  }

  try {
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-5-mini",
        input: [
          { role: "system", content: CATEGORIZE_PROMPT },
          { role: "user", content: message },
        ],
      }),
    });

    if (!res.ok) {
      logger.error("GPT-5-mini categorization failed: %d", res.status);
      return { category: "other", sentiment: "neutral", summary: message.slice(0, 100), reply: "Thanks! We got your feedback." };
    }

    const data = await res.json();
    const text = data.output?.[0]?.content?.[0]?.text || data.choices?.[0]?.message?.content || "";
    const parsed = JSON.parse(text);
    return {
      category: parsed.category || "other",
      sentiment: parsed.sentiment || "neutral",
      summary: parsed.summary || message.slice(0, 100),
      reply: parsed.reply || "Thanks! We got your feedback.",
    };
  } catch (err) {
    logger.error("Feedback categorization error: %s", (err as Error).message);
    return { category: "other", sentiment: "neutral", summary: message.slice(0, 100), reply: "Thanks! We got your feedback." };
  }
}

export async function feedbackRoutes(app: FastifyInstance) {
  // Submit feedback (authenticated — we know who they are)
  app.post("/api/feedback", {
    preHandler: [authenticateAny],
    handler: async (request, reply) => {
      const { message, page } = request.body as { message: string; page?: string };

      if (!message?.trim()) {
        return reply.status(400).send({ error: "Message is required" });
      }

      if (message.length > 5000) {
        return reply.status(400).send({ error: "Message too long (max 5000 characters)" });
      }

      const db = getDb();

      // Categorize with GPT-5-mini (async, don't block response)
      const categorization = await categorizeFeedback(message);

      const [entry] = await db
        .insert(feedback)
        .values({
          user_id: request.userId || undefined,
          user_email: (request as any).userEmail || undefined,
          message: message.trim(),
          category: categorization.category,
          sentiment: categorization.sentiment,
          ai_summary: categorization.summary,
          page: page || undefined,
        })
        .returning();

      return reply.status(201).send({
        id: entry.id,
        category: categorization.category,
        summary: categorization.summary,
        reply: categorization.reply,
      });
    },
  });

  // Get feedback (internal only — admin use)
  app.get("/api/feedback", {
    preHandler: [authenticateInternal],
    handler: async (request, reply) => {
      const { limit = "50" } = request.query as { limit?: string };
      const db = getDb();

      const entries = await db
        .select()
        .from(feedback)
        .orderBy(desc(feedback.created_at))
        .limit(Math.min(parseInt(limit, 10) || 50, 200));

      return reply.send({ feedback: entries });
    },
  });
}

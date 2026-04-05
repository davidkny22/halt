import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { users, apiKeys } from "../db/schema.js";
import { generateApiKey, hashApiKey } from "../auth/api-key.js";
import { RateLimiter } from "../util/rate-limiter.js";
import { getConfig } from "../config.js";
import { logger } from "../util/logger.js";
import { timingSafeEqual, randomBytes } from "node:crypto";
import { Resend } from "resend";

const authRateLimiter = new RateLimiter(100, 100); // 100 req/min (dashboard proxies all users through one IP)

// Magic link tokens: pollingToken → { email, verified, expiresAt }
const magicLinkTokens = new Map<string, { email: string; verified: boolean; expiresAt: number }>();

// Evict expired tokens every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of magicLinkTokens) {
    if (now > val.expiresAt) magicLinkTokens.delete(key);
  }
}, 5 * 60_000);

async function sendWelcomeEmail(email: string) {
  const config = getConfig();
  if (!config.RESEND_API_KEY) return;
  const resend = new Resend(config.RESEND_API_KEY);

  try {
    await resend.emails.send({
      from: "David from halt <david@halt.dev>",
      to: email,
      subject: "Welcome to halt — your agents are in good hands",
      text: [
        "Hey! Thanks for signing up for halt.",
        "",
        "You're now set up with free monitoring for 1 agent — event capture, pattern rules, and a kill switch activation every month.",
        "",
        "Quick start:",
        "1. Install the plugin: npm install @halt/plugin",
        "2. Add your API key to openclaw.json",
        "3. That's it — your agent is monitored",
        "",
        "If you have a beta invite code, enter it in Settings to unlock 6 months of Pro (AI anomaly detection, NL rules, unlimited kill switch, all alert channels).",
        "",
        "I built halt because I kept watching my own agents do things I didn't ask for. If you have feedback, questions, or just want to say hi — reply to this email or use the feedback widget on the dashboard. I read everything.",
        "",
        "— David Kogan",
        "  Founder, halt",
        "  halt.dev",
      ].join("\n"),
    });
  } catch (err) {
    logger.error("Failed to send welcome email: %s", (err as Error).message);
  }
}

function validateInternalSecret(request: any): boolean {
  const config = getConfig();
  if (!config.INTERNAL_API_SECRET) return false;
  const secret = request.headers["x-internal-secret"] as string;
  if (!secret) return false;
  try {
    const secretBuf = Buffer.from(secret);
    const expectedBuf = Buffer.from(config.INTERNAL_API_SECRET);
    return secretBuf.length === expectedBuf.length && timingSafeEqual(secretBuf, expectedBuf);
  } catch {
    return false;
  }
}

export async function authRoutes(app: FastifyInstance) {
  // Called by dashboard after GitHub OAuth — creates or finds user, returns API key
  // Requires INTERNAL_API_SECRET — only the dashboard backend should call this
  app.post("/api/auth/provision", {
    handler: async (request, reply) => {
      if (!validateInternalSecret(request)) {
        return reply.status(401).send({ error: "Unauthorized" });
      }

      const ip = request.ip;
      if (!authRateLimiter.consume(ip)) {
        return reply.status(429).send({ error: "Too many requests" });
      }
      const { email, github_id, name } = request.body as {
        email: string;
        github_id?: string;
        name?: string;
      };

      if (!email) {
        return reply.status(400).send({ error: "email required" });
      }

      const db = getDb();

      // Find or create user
      let [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase()));

      if (!user) {
        [user] = await db
          .insert(users)
          .values({
            email: email.toLowerCase(),
            github_id: github_id || null,
            email_verified: true,
            tier: "free",
          })
          .returning();

        // Welcome email sent via /api/auth/welcome (called from onboarding page)
      }

      // Check if user already has an active API key
      const existingKeys = await db
        .select()
        .from(apiKeys)
        .where(eq(apiKeys.user_id, user.id));

      const activeKey = existingKeys.find((k) => !k.revoked_at);

      if (activeKey) {
        // Return existing key prefix — user needs to use their stored key
        return reply.send({
          user_id: user.id,
          tier: user.tier,
          has_key: true,
          key_prefix: activeKey.prefix,
        });
      }

      // Generate new API key
      const { raw, prefix } = generateApiKey();
      const keyHash = await hashApiKey(raw);

      await db.insert(apiKeys).values({
        user_id: user.id,
        key_hash: keyHash,
        prefix,
      });

      return reply.send({
        user_id: user.id,
        tier: user.tier,
        has_key: true,
        api_key: raw, // Only returned on first creation
        key_prefix: prefix,
      });
    },
  });

  // Send welcome email (called from onboarding page on first dashboard access)
  app.post("/api/auth/welcome", {
    handler: async (request, reply) => {
      if (!validateInternalSecret(request)) {
        return reply.status(401).send({ error: "Unauthorized" });
      }

      const { email } = request.body as { email: string };
      if (!email) {
        return reply.status(400).send({ error: "email required" });
      }

      sendWelcomeEmail(email);
      return reply.send({ sent: true });
    },
  });

  // Get user info by email (for dashboard session enrichment)
  // Requires INTERNAL_API_SECRET — only the dashboard backend should call this
  app.get("/api/auth/me", {
    handler: async (request, reply) => {
      if (!validateInternalSecret(request)) {
        return reply.status(401).send({ error: "Unauthorized" });
      }

      const ip = request.ip;
      if (!authRateLimiter.consume(ip)) {
        return reply.status(429).send({ error: "Too many requests" });
      }

      const email = (request.query as { email?: string }).email;
      if (!email) {
        return reply.status(400).send({ error: "email required" });
      }

      const db = getDb();
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase()));

      if (!user) {
        return reply.status(404).send({ error: "User not found" });
      }

      const keys = await db
        .select()
        .from(apiKeys)
        .where(eq(apiKeys.user_id, user.id));

      const activeKey = keys.find((k) => !k.revoked_at);

      return reply.send({
        user_id: user.id,
        email: user.email,
        tier: user.tier,
        has_key: !!activeKey,
        key_prefix: activeKey?.prefix,
        data_sharing_enabled: user.data_sharing_enabled,
        rule_visibility: user.rule_visibility,
        beta_code: user.beta_code,
        beta_expires_at: user.beta_expires_at?.toISOString() || null,
        created_at: user.created_at,
      });
    },
  });

  // CLI provision: verify GitHub token, create/find user, return raw API key
  // Requires cryptographic proof via GitHub token — no unverified email-only provisioning
  app.post("/api/auth/cli-provision", {
    handler: async (request, reply) => {
      const ip = request.ip;
      if (!authRateLimiter.consume(ip)) {
        return reply.status(429).send({ error: "Too many requests" });
      }

      const { email, github_token, magic_link_token } = request.body as {
        email: string;
        github_token?: string;
        magic_link_token?: string;
      };

      if (!email || !email.includes("@")) {
        return reply.status(400).send({ error: "Valid email required" });
      }

      // Require cryptographic proof: GitHub token, verified magic link, or internal secret
      if (magic_link_token) {
        // Verify the magic link token was actually verified for this email
        const entry = magicLinkTokens.get(magic_link_token);
        if (!entry || !entry.verified || entry.email !== email.toLowerCase() || Date.now() > entry.expiresAt) {
          return reply.status(401).send({ error: "Invalid or expired magic link token" });
        }
        magicLinkTokens.delete(magic_link_token);
      } else if (github_token) {
        try {
          const ghRes = await fetch("https://api.github.com/user/emails", {
            headers: { Authorization: `token ${github_token}`, "User-Agent": "halt" },
            signal: AbortSignal.timeout(5000),
          });
          if (!ghRes.ok) {
            return reply.status(401).send({ error: "Invalid GitHub token" });
          }
          const emails = await ghRes.json() as { email: string; primary: boolean; verified: boolean }[];
          const verified = emails.find((e) => e.email.toLowerCase() === email.toLowerCase() && e.verified);
          if (!verified) {
            return reply.status(401).send({ error: "Email not verified on GitHub" });
          }
        } catch {
          return reply.status(401).send({ error: "Failed to verify GitHub token" });
        }
      } else {
        // No GitHub token — require internal secret (dashboard server-side calls only)
        const internalSecret = request.headers["x-internal-secret"] as string | undefined;
        const expected = getConfig().INTERNAL_API_SECRET;
        if (!expected || !internalSecret || internalSecret.length !== expected.length || !timingSafeEqual(Buffer.from(internalSecret), Buffer.from(expected))) {
          return reply.status(401).send({ error: "Authentication required. Use GitHub auth or internal secret." });
        }
      }

      const db = getDb();

      // Find or create user
      let [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase()));

      if (!user) {
        [user] = await db
          .insert(users)
          .values({ email: email.toLowerCase() })
          .returning();

        sendWelcomeEmail(email);
      }

      // Generate new API key
      const { raw, prefix } = generateApiKey();
      const hash = await hashApiKey(raw);

      await db.insert(apiKeys).values({
        user_id: user.id,
        key_hash: hash,
        prefix,
      });

      return reply.send({
        apiKey: raw,
        email: user.email,
        tier: user.tier,
      });
    },
  });

  // CLI magic link: send a verification email
  app.post("/api/auth/cli-magic-link", {
    handler: async (request, reply) => {
      const ip = request.ip;
      if (!authRateLimiter.consume(ip)) {
        return reply.status(429).send({ error: "Too many requests" });
      }

      const { email } = request.body as { email: string };
      if (!email || !email.includes("@")) {
        return reply.status(400).send({ error: "Valid email required" });
      }

      const config = getConfig();
      if (!config.RESEND_API_KEY) {
        return reply.status(503).send({ error: "Email service not configured" });
      }

      // Generate polling token and verification code
      const pollingToken = randomBytes(32).toString("hex");
      const verifyCode = randomBytes(16).toString("hex");
      const expiresAt = Date.now() + 5 * 60 * 1000; // 5 min

      magicLinkTokens.set(pollingToken, { email: email.toLowerCase(), verified: false, expiresAt });
      magicLinkTokens.set(verifyCode, { email: email.toLowerCase(), verified: false, expiresAt });

      // Link the verify code to the polling token
      (magicLinkTokens.get(verifyCode) as any).pollingToken = pollingToken;

      const verifyUrl = `https://api.halt.dev/api/auth/cli-magic-link/verify?code=${verifyCode}`;

      const resend = new Resend(config.RESEND_API_KEY);
      await resend.emails.send({
        from: "halt <login@halt.dev>",
        to: email,
        subject: "Sign in to halt CLI",
        html: `
          <p>Click the link below to sign in to halt CLI:</p>
          <p><a href="${verifyUrl}" style="background:#FF6B4A;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Verify Email</a></p>
          <p style="color:#666;font-size:12px;">This link expires in 5 minutes. If you didn't request this, ignore this email.</p>
        `,
      });

      return reply.send({ token: pollingToken });
    },
  });

  // CLI magic link: verify (user clicks email link)
  app.get("/api/auth/cli-magic-link/verify", {
    handler: async (request, reply) => {
      const { code } = request.query as { code: string };
      if (!code) {
        return reply.status(400).send({ error: "Missing code" });
      }

      const entry = magicLinkTokens.get(code);
      if (!entry || Date.now() > entry.expiresAt) {
        return reply.type("text/html").send("<h2>Link expired or invalid.</h2><p>Please run <code>halt init</code> again.</p>");
      }

      // Mark the polling token as verified
      const pollingToken = (entry as any).pollingToken;
      if (pollingToken && magicLinkTokens.has(pollingToken)) {
        magicLinkTokens.get(pollingToken)!.verified = true;
      }

      // Clean up the verify code
      magicLinkTokens.delete(code);

      return reply.type("text/html").send("<h2>Email verified!</h2><p>You can return to your terminal. halt CLI will continue automatically.</p>");
    },
  });

  // CLI magic link: poll for verification status
  app.post("/api/auth/cli-magic-link/status", {
    handler: async (request, reply) => {
      const { token } = request.body as { token: string };
      if (!token) {
        return reply.status(400).send({ error: "Missing token" });
      }

      const entry = magicLinkTokens.get(token);
      if (!entry || Date.now() > entry.expiresAt) {
        return reply.send({ verified: false, expired: true });
      }

      if (entry.verified) {
        // Don't delete — provision endpoint will clean up after key issuance
        return reply.send({ verified: true, email: entry.email });
      }

      return reply.send({ verified: false, expired: false });
    },
  });
}

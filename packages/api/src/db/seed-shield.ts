import { getDb } from "./client.js";
import { rules } from "./schema.js";
import { eq, and } from "drizzle-orm";
import { logger } from "../util/logger.js";

/**
 * Seed default Shield (injection detection) rules for a user.
 * Idempotent — safe to call multiple times.
 */
export async function seedShieldRules(userId: string): Promise<void> {
  const db = getDb();

  // Check if user already has injection rules
  const existing = await db
    .select()
    .from(rules)
    .where(and(eq(rules.user_id, userId), eq(rules.rule_type, "injection")))
    .limit(1);

  if (existing.length > 0) return;

  await db.insert(rules).values([
    {
      user_id: userId,
      name: "Shield: Critical Threats",
      rule_type: "injection",
      config: {
        type: "injection",
        shield_tier: "critical",
        categories: ["destructive_commands", "credential_exfiltration"],
        scan_outputs: true,
        is_shield: true,
        allowlist: [],
      },
      action_mode: "block",
      enabled: true,
    },
    {
      user_id: userId,
      name: "Shield: Injection Detection",
      rule_type: "injection",
      config: {
        type: "injection",
        shield_tier: "high",
        categories: ["instruction_overrides", "system_prompt_manipulation"],
        scan_outputs: true,
        is_shield: true,
        allowlist: [],
      },
      action_mode: "block",
      enabled: true,
    },
    {
      user_id: userId,
      name: "Shield: Suspicious Patterns",
      rule_type: "injection",
      config: {
        type: "injection",
        shield_tier: "medium",
        categories: ["encoding_obfuscation", "data_exfiltration"],
        scan_outputs: true,
        is_shield: true,
        allowlist: [],
      },
      action_mode: "alert",
      enabled: true,
    },
  ]);

  logger.info("Seeded Shield rules for user %s", userId);
}

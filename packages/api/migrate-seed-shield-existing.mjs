import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL);

// Find all paid/trial/team/enterprise users who DON'T have injection rules
const usersWithoutShield = await sql`
  SELECT u.id FROM users u
  WHERE u.tier IN ('paid', 'trial', 'team', 'enterprise')
  AND NOT EXISTS (
    SELECT 1 FROM rules r WHERE r.user_id = u.id AND r.rule_type = 'injection'
  )
`;

console.log(`Found ${usersWithoutShield.length} user(s) without Shield rules`);

for (const user of usersWithoutShield) {
  await sql`
    INSERT INTO rules (id, user_id, name, rule_type, config, action_mode, enabled)
    VALUES
      (gen_random_uuid(), ${user.id}, 'Shield: Critical Threats', 'injection',
       ${JSON.stringify({ type: "injection", shield_tier: "critical", categories: ["destructive_commands", "credential_exfiltration"], scan_outputs: true, is_shield: true, allowlist: [] })}::jsonb,
       'block', true),
      (gen_random_uuid(), ${user.id}, 'Shield: Injection Detection', 'injection',
       ${JSON.stringify({ type: "injection", shield_tier: "high", categories: ["instruction_overrides", "system_prompt_manipulation"], scan_outputs: true, is_shield: true, allowlist: [] })}::jsonb,
       'block', true),
      (gen_random_uuid(), ${user.id}, 'Shield: Suspicious Patterns', 'injection',
       ${JSON.stringify({ type: "injection", shield_tier: "medium", categories: ["encoding_obfuscation", "data_exfiltration"], scan_outputs: true, is_shield: true, allowlist: [] })}::jsonb,
       'alert', true)
  `;
  console.log(`  Seeded Shield rules for user ${user.id}`);
}

await sql.end();
console.log("Done!");

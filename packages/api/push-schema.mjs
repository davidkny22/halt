/**
 * Push Drizzle schema to production database.
 * Runs raw SQL to add missing tables/columns without interactive prompts.
 *
 * Usage: DATABASE_URL=postgres://... node push-schema.mjs
 *   or:  node push-schema.mjs <database_url>
 * Falls back to .env if neither provided.
 */

import postgres from "postgres";
import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env") });

const dbUrl = process.argv[2] || process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("No DATABASE_URL provided. Pass as argument or set env var.");
  process.exit(1);
}

const sql = postgres(dbUrl);

async function run() {
  console.log("Pushing schema changes to database...\n");

  // 1. Sessions table
  await maybeCreateTable("sessions", `
    CREATE TABLE IF NOT EXISTS sessions (
      id VARCHAR(255) PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
      status VARCHAR(32) NOT NULL DEFAULT 'active',
      started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      ended_at TIMESTAMPTZ,
      duration_ms INTEGER,
      event_count INTEGER NOT NULL DEFAULT 0,
      total_cost NUMERIC(12, 6) NOT NULL DEFAULT 0,
      total_tokens INTEGER NOT NULL DEFAULT 0,
      kill_reason TEXT,
      metadata JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await maybeCreateIndex("sessions_user_idx", `
    CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id)
  `);
  await maybeCreateIndex("sessions_agent_idx", `
    CREATE INDEX IF NOT EXISTS sessions_agent_idx ON sessions (agent_id)
  `);
  await maybeCreateIndex("sessions_started_idx", `
    CREATE INDEX IF NOT EXISTS sessions_started_idx ON sessions (started_at)
  `);

  // 2. action_mode column on rules
  await maybeAddColumn("rules", "action_mode", `
    ALTER TABLE rules ADD COLUMN action_mode VARCHAR(16) NOT NULL DEFAULT 'both'
  `);

  // 3. version column on agents (optimistic locking)
  await maybeAddColumn("agents", "version", `
    ALTER TABLE agents ADD COLUMN version INTEGER NOT NULL DEFAULT 1
  `);

  console.log("\nSchema push complete.");
  await sql.end();
}

async function maybeCreateTable(name, ddl) {
  const [exists] = await sql`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = ${name}
    )
  `;
  if (exists.exists) {
    console.log(`  ✓ Table "${name}" already exists`);
  } else {
    await sql.unsafe(ddl);
    console.log(`  + Created table "${name}"`);
  }
}

async function maybeAddColumn(table, column, ddl) {
  const [exists] = await sql`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = ${table} AND column_name = ${column}
    )
  `;
  if (exists.exists) {
    console.log(`  ✓ Column "${table}.${column}" already exists`);
  } else {
    await sql.unsafe(ddl);
    console.log(`  + Added column "${table}.${column}"`);
  }
}

async function maybeCreateIndex(name, ddl) {
  const [exists] = await sql`
    SELECT EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE schemaname = 'public' AND indexname = ${name}
    )
  `;
  if (exists.exists) {
    console.log(`  ✓ Index "${name}" already exists`);
  } else {
    await sql.unsafe(ddl);
    console.log(`  + Created index "${name}"`);
  }
}

run().catch((err) => {
  console.error("Schema push failed:", err);
  process.exit(1);
});

import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL);

await sql.unsafe(`ALTER TABLE rules ADD COLUMN IF NOT EXISTS agent_ids TEXT[]`);
console.log("rules.agent_ids column added");

await sql.end();
console.log("Migration complete!");

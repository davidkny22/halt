import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL);

await sql.unsafe(`ALTER TYPE agent_status ADD VALUE IF NOT EXISTS 'discovered'`);
console.log("agent_status enum: added 'discovered'");

await sql.end();
console.log("Migration complete!");

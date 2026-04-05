import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getConfig } from "../config.js";
import * as schema from "./schema.js";

let _db: ReturnType<typeof drizzle<typeof schema>> | undefined;

export function getDb() {
  if (!_db) {
    const config = getConfig();
    const sql = postgres(config.DATABASE_URL);
    _db = drizzle(sql, { schema });
  }
  return _db;
}

export type Database = ReturnType<typeof getDb>;

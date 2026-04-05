import Database from "better-sqlite3";
import type { ClawnitorEvent } from "@clawnitor/shared";
import { CACHE_SIZE_LIMIT, CACHE_AGE_LIMIT } from "@clawnitor/shared";
import { join } from "node:path";
import { tmpdir } from "node:os";

export class SqliteCache {
  private db: Database.Database;

  constructor(dbPath?: string) {
    const path = dbPath || join(tmpdir(), "clawnitor-cache.db");
    this.db = new Database(path);
    this.db.pragma("journal_mode = WAL");
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS cached_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        payload TEXT NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
      )
    `);
  }

  cache(events: ClawnitorEvent[]): void {
    const insert = this.db.prepare(
      "INSERT INTO cached_events (payload) VALUES (?)"
    );
    const tx = this.db.transaction((evts: ClawnitorEvent[]) => {
      for (const event of evts) {
        insert.run(JSON.stringify(event));
      }
    });
    tx(events);
    this.prune();
  }

  flush(limit: number = 50): ClawnitorEvent[] {
    const rows = this.db
      .prepare("SELECT id, payload FROM cached_events ORDER BY id ASC LIMIT ?")
      .all(limit) as { id: number; payload: string }[];

    if (rows.length === 0) return [];

    const events = rows.map((r) => JSON.parse(r.payload) as ClawnitorEvent);
    const ids = rows.map((r) => r.id);

    const placeholders = ids.map(() => "?").join(",");
    this.db
      .prepare(`DELETE FROM cached_events WHERE id IN (${placeholders})`)
      .run(...ids);

    return events;
  }

  count(): number {
    const row = this.db
      .prepare("SELECT COUNT(*) as count FROM cached_events")
      .get() as { count: number };
    return row.count;
  }

  sizeBytes(): number {
    const row = this.db
      .prepare(
        "SELECT COALESCE(SUM(LENGTH(payload)), 0) as size FROM cached_events"
      )
      .get() as { size: number };
    return row.size;
  }

  prune(): void {
    // Age-based eviction
    const maxAge = Math.floor((Date.now() - CACHE_AGE_LIMIT) / 1000);
    this.db
      .prepare("DELETE FROM cached_events WHERE created_at < ?")
      .run(maxAge);

    // Size-based eviction
    while (this.sizeBytes() > CACHE_SIZE_LIMIT) {
      const deleted = this.db
        .prepare(
          "DELETE FROM cached_events WHERE id IN (SELECT id FROM cached_events ORDER BY id ASC LIMIT 100)"
        )
        .run();
      if (deleted.changes === 0) break;
    }
  }

  close(): void {
    this.db.close();
  }
}

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
    try {
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
    } catch (err) {
      console.error("Clawnitor: SQLite cache write failed:", (err as Error).message);
    }
  }

  flush(limit: number = 50): ClawnitorEvent[] {
    try {
      const rows = this.db
        .prepare("SELECT id, payload FROM cached_events ORDER BY id ASC LIMIT ?")
        .all(limit) as { id: number; payload: string }[];

      if (rows.length === 0) return [];

      const events: ClawnitorEvent[] = [];
      const ids: number[] = [];
      for (const r of rows) {
        try {
          events.push(JSON.parse(r.payload) as ClawnitorEvent);
          ids.push(r.id);
        } catch {
          // Skip corrupted entries, still delete them
          ids.push(r.id);
        }
      }

      if (ids.length > 0) {
        const placeholders = ids.map(() => "?").join(",");
        this.db
          .prepare(`DELETE FROM cached_events WHERE id IN (${placeholders})`)
          .run(...ids);
      }

      return events;
    } catch (err) {
      console.error("Clawnitor: SQLite cache flush failed:", (err as Error).message);
      return [];
    }
  }

  count(): number {
    try {
      const row = this.db
        .prepare("SELECT COUNT(*) as count FROM cached_events")
        .get() as { count: number };
      return row.count;
    } catch {
      return 0;
    }
  }

  sizeBytes(): number {
    try {
      const row = this.db
        .prepare(
          "SELECT COALESCE(SUM(LENGTH(payload)), 0) as size FROM cached_events"
        )
        .get() as { size: number };
      return row.size;
    } catch {
      return 0;
    }
  }

  prune(): void {
    try {
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
    } catch (err) {
      console.error("Clawnitor: SQLite prune failed:", (err as Error).message);
    }
  }

  close(): void {
    try {
      this.db.close();
    } catch {}
  }
}

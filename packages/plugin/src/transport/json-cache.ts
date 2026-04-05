/**
 * JSON file cache for offline event resilience.
 * Replaces SqliteCache — zero native dependencies.
 */

import type { ClawnitorEvent } from "@clawnitor/shared";
import { CACHE_SIZE_LIMIT, CACHE_AGE_LIMIT } from "@clawnitor/shared";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

interface CachedEntry {
  payload: ClawnitorEvent;
  created_at: number; // unix ms
}

export class JsonCache {
  private filePath: string;
  private entries: CachedEntry[] = [];

  constructor(filePath?: string) {
    this.filePath = filePath || join(tmpdir(), "clawnitor-cache.json");

    // Ensure directory exists
    try {
      mkdirSync(join(this.filePath, ".."), { recursive: true });
    } catch {}

    // Load existing cache from disk
    try {
      const raw = readFileSync(this.filePath, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        this.entries = parsed;
      }
    } catch {
      // No existing cache or corrupted — start fresh
      this.entries = [];
    }
  }

  cache(events: ClawnitorEvent[]): void {
    try {
      const now = Date.now();
      for (const event of events) {
        this.entries.push({ payload: event, created_at: now });
      }
      this.prune();
      this.persist();
    } catch {
      // Silently fail — cache is best-effort
    }
  }

  flush(limit: number = 50): ClawnitorEvent[] {
    try {
      const batch = this.entries.splice(0, limit);
      if (batch.length > 0) {
        this.persist();
      }
      return batch.map((e) => e.payload);
    } catch {
      return [];
    }
  }

  /** Read all cached events without removing them (for report/serve) */
  readAll(): ClawnitorEvent[] {
    return this.entries.map((e) => e.payload);
  }

  count(): number {
    return this.entries.length;
  }

  sizeBytes(): number {
    try {
      return JSON.stringify(this.entries).length;
    } catch {
      return 0;
    }
  }

  prune(): void {
    const now = Date.now();

    // Age-based eviction
    this.entries = this.entries.filter(
      (e) => now - e.created_at < CACHE_AGE_LIMIT
    );

    // Size-based eviction — drop oldest entries until under limit
    while (this.sizeBytes() > CACHE_SIZE_LIMIT && this.entries.length > 0) {
      this.entries.splice(0, 100);
    }
  }

  close(): void {
    try {
      this.persist();
    } catch {}
  }

  private persist(): void {
    try {
      writeFileSync(this.filePath, JSON.stringify(this.entries), "utf-8");
    } catch {
      // Disk write failed — entries remain in memory for this session
    }
  }
}

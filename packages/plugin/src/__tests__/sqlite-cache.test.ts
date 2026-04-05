import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { SqliteCache } from "../transport/sqlite-cache.js";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { unlinkSync } from "node:fs";
import type { ClawnitorEvent } from "@clawnitor/shared";

function makeEvent(id: string): ClawnitorEvent {
  return {
    agent_id: "test-agent",
    session_id: "session-1",
    timestamp: new Date().toISOString(),
    event_type: "tool_use",
    action: "test action",
    target: "test target",
    metadata: {},
    severity_hint: "normal",
    event_id: id,
    plugin_version: "0.0.1",
  };
}

describe("SqliteCache", () => {
  let cache: SqliteCache;
  let dbPath: string;

  beforeEach(() => {
    dbPath = join(tmpdir(), `clawnitor-test-${Date.now()}.db`);
    cache = new SqliteCache(dbPath);
  });

  afterEach(() => {
    cache.close();
    try {
      unlinkSync(dbPath);
      unlinkSync(dbPath + "-wal");
      unlinkSync(dbPath + "-shm");
    } catch {}
  });

  it("caches and flushes events", () => {
    const events = [makeEvent("id-1"), makeEvent("id-2")];
    cache.cache(events);
    expect(cache.count()).toBe(2);

    const flushed = cache.flush(10);
    expect(flushed).toHaveLength(2);
    expect(flushed[0].event_id).toBe("id-1");
    expect(cache.count()).toBe(0);
  });

  it("flush respects limit", () => {
    cache.cache([makeEvent("id-1"), makeEvent("id-2"), makeEvent("id-3")]);
    const flushed = cache.flush(2);
    expect(flushed).toHaveLength(2);
    expect(cache.count()).toBe(1);
  });

  it("returns empty array when no events cached", () => {
    const flushed = cache.flush();
    expect(flushed).toHaveLength(0);
  });

  it("reports size in bytes", () => {
    expect(cache.sizeBytes()).toBe(0);
    cache.cache([makeEvent("id-1")]);
    expect(cache.sizeBytes()).toBeGreaterThan(0);
  });

  it("preserves event data through cache/flush cycle", () => {
    const event = makeEvent("round-trip");
    event.metadata = { tool_name: "send_email", cost_usd: 0.05 };
    event.severity_hint = "elevated";

    cache.cache([event]);
    const [flushed] = cache.flush(1);

    expect(flushed.event_id).toBe("round-trip");
    expect(flushed.metadata).toEqual({ tool_name: "send_email", cost_usd: 0.05 });
    expect(flushed.severity_hint).toBe("elevated");
  });
});

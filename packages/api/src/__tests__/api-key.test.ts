import { describe, it, expect } from "vitest";
import { generateApiKey, hashApiKey, verifyApiKey } from "../auth/api-key.js";
import { API_KEY_PREFIX } from "@clawnitor/shared";

describe("API Key", () => {
  it("generates a key with the correct prefix", () => {
    const { raw, prefix } = generateApiKey();
    expect(raw.startsWith(API_KEY_PREFIX)).toBe(true);
    expect(prefix).toBe(raw.slice(0, 16));
  });

  it("generates unique keys", () => {
    const keys = new Set(Array.from({ length: 50 }, () => generateApiKey().raw));
    expect(keys.size).toBe(50);
  });

  it("hash and verify round-trip succeeds", async () => {
    const { raw } = generateApiKey();
    const hash = await hashApiKey(raw);
    const valid = await verifyApiKey(raw, hash);
    expect(valid).toBe(true);
  });

  it("verify fails with wrong key", async () => {
    const { raw } = generateApiKey();
    const hash = await hashApiKey(raw);
    const valid = await verifyApiKey("wrong_key", hash);
    expect(valid).toBe(false);
  });
});

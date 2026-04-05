import { describe, it, expect } from "vitest";
import { redact, DEFAULT_PATTERNS } from "../redaction.js";

describe("redaction", () => {
  it("redacts OpenAI API keys", () => {
    const input = "Using key sk-1234567890abcdefghijklmnop";
    const result = redact(input, DEFAULT_PATTERNS);
    expect(result).not.toContain("sk-1234567890");
    expect(result).toContain("[REDACTED]");
  });

  it("redacts Bearer tokens", () => {
    const input = "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9";
    const result = redact(input, DEFAULT_PATTERNS);
    expect(result).not.toContain("eyJhbGci");
    expect(result).toContain("[REDACTED]");
  });

  it("redacts password assignments", () => {
    const input = "password=mysecretpassword123";
    const result = redact(input, DEFAULT_PATTERNS);
    expect(result).not.toContain("mysecretpassword");
    expect(result).toContain("[REDACTED]");
  });

  it("redacts AWS access keys", () => {
    const input = "Using AKIAIOSFODNN7EXAMPLE for AWS";
    const result = redact(input, DEFAULT_PATTERNS);
    expect(result).not.toContain("AKIAIOSFODNN7EXAMPLE");
    expect(result).toContain("[REDACTED]");
  });

  it("redacts GitHub tokens", () => {
    const input = "token ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
    const result = redact(input, DEFAULT_PATTERNS);
    expect(result).not.toContain("ghp_");
    expect(result).toContain("[REDACTED]");
  });

  it("preserves non-secret text", () => {
    const input = "The agent sent an email to user@example.com";
    const result = redact(input, DEFAULT_PATTERNS);
    expect(result).toBe(input);
  });

  it("applies custom patterns", () => {
    const input = "custom_secret_abc123_end";
    const result = redact(input, ["custom_secret_[a-z0-9]+"]);
    expect(result).toContain("[REDACTED]");
  });

  it("handles invalid regex gracefully", () => {
    const input = "normal text";
    const result = redact(input, ["[invalid("]);
    expect(result).toBe(input);
  });
});

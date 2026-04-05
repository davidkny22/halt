/**
 * Shield — Deep Object Scanner
 *
 * Recursive traversal of arbitrary objects to find injection patterns
 * buried in nested data structures (API responses, RAG results, etc.).
 */

import type { ShieldPattern, ShieldDetection } from "./patterns.js";

const MAX_DEPTH = 20;
const MAX_STRING_LENGTH = 10_000;

/**
 * Check if a string segment is inside a markdown code fence.
 * Returns the text with code-fenced content replaced by spaces
 * (preserving length for position tracking).
 */
function stripCodeFences(text: string): string {
  return text.replace(/```[\s\S]*?```/g, (match) => " ".repeat(match.length));
}

/**
 * Recursively scan a value for injection patterns.
 * Handles strings, arrays, plain objects, and coerced primitives.
 * Uses WeakSet for cycle detection and depth limiting.
 */
export function deepScan(
  value: unknown,
  patterns: ShieldPattern[],
  options?: { maxDepth?: number; isOutput?: boolean }
): ShieldDetection[] {
  const maxDepth = options?.maxDepth ?? MAX_DEPTH;
  const isOutput = options?.isOutput ?? false;
  const visited = new WeakSet<object>();
  const detections: ShieldDetection[] = [];

  // Filter patterns based on input vs output context
  const activePatterns = isOutput
    ? patterns
    : patterns.filter((p) => !p.outputOnly);

  function scan(val: unknown, depth: number): void {
    if (depth > maxDepth) return;

    if (val === null || val === undefined) return;

    if (typeof val === "string") {
      scanString(val);
      return;
    }

    if (typeof val === "number" || typeof val === "boolean") {
      return; // Primitives other than strings rarely contain injections
    }

    if (typeof val !== "object") {
      // Coerce unknown types to string
      scanString(String(val).slice(0, MAX_STRING_LENGTH));
      return;
    }

    // Cycle detection
    if (visited.has(val)) return;
    visited.add(val);

    if (Array.isArray(val)) {
      for (const item of val) {
        scan(item, depth + 1);
      }
      return;
    }

    // Plain object
    for (const key of Object.keys(val)) {
      scan((val as Record<string, unknown>)[key], depth + 1);
    }
  }

  function scanString(raw: string): void {
    if (raw.length === 0) return;
    const text = raw.slice(0, MAX_STRING_LENGTH);

    // Strip code fences to avoid false positives on documentation
    const stripped = stripCodeFences(text);

    // Normalize for matching
    const normalized = stripped.normalize("NFKC");

    for (const pattern of activePatterns) {
      if (pattern.pattern.test(normalized)) {
        // Extract matched substring for reporting
        const match = normalized.match(pattern.pattern);
        detections.push({
          patternName: pattern.name,
          category: pattern.category,
          severity: pattern.severity,
          matched: match ? match[0].slice(0, 100) : "(pattern matched)",
          description: pattern.description,
        });
      }
    }
  }

  scan(value, 0);
  return detections;
}

/**
 * Lightweight Shield scanner for CLI testing.
 * Loads patterns from the plugin's compiled output at runtime.
 */

export interface ScanResult {
  detected: boolean;
  detections: Detection[];
  highestSeverity: string | null;
}

interface Detection {
  patternName: string;
  category: string;
  severity: string;
  matched: string;
}

interface Pattern {
  name: string;
  pattern: RegExp;
  category: string;
  severity: string;
  description: string;
  outputOnly?: boolean;
}

const SEVERITY_PRIORITY: Record<string, number> = { critical: 3, high: 2, medium: 1 };

let cachedPatterns: Pattern[] | null = null;

export async function loadPatterns(): Promise<Pattern[]> {
  if (cachedPatterns) return cachedPatterns;

  // Try loading from the plugin's compiled dist via workspace
  const paths = [
    "../../plugin/dist/shield/patterns.js",
    "@halt/plugin/dist/shield/patterns.js",
  ];

  for (const p of paths) {
    try {
      const mod = await import(p);
      if (mod.SHIELD_PATTERNS?.length > 0) {
        cachedPatterns = mod.SHIELD_PATTERNS;
        return cachedPatterns!;
      }
    } catch {
      continue;
    }
  }

  console.error("  Error: Could not load Shield patterns.");
  console.error("  Make sure the plugin is built: pnpm --filter @halt/plugin build");
  process.exit(1);
}

function scanText(text: string, patterns: Pattern[]): Detection[] {
  const normalized = text.normalize("NFKC");
  const detections: Detection[] = [];

  for (const p of patterns) {
    if (p.pattern.test(normalized)) {
      const match = normalized.match(p.pattern);
      detections.push({
        patternName: p.name,
        category: p.category,
        severity: p.severity,
        matched: match ? match[0].slice(0, 100) : "(matched)",
      });
    }
  }
  return detections;
}

function highest(detections: Detection[]): string | null {
  let best: string | null = null;
  let max = 0;
  for (const d of detections) {
    const p = SEVERITY_PRIORITY[d.severity] || 0;
    if (p > max) { max = p; best = d.severity; }
  }
  return best;
}

function buildResult(detections: Detection[]): ScanResult {
  return {
    detected: detections.length > 0,
    detections,
    highestSeverity: highest(detections),
  };
}

const EMPTY: ScanResult = { detected: false, detections: [], highestSeverity: null };

export function createScanner(patterns: Pattern[]) {
  const inputPatterns = patterns.filter(p => !p.outputOnly);

  return {
    scanInput(toolName: string, params?: Record<string, unknown>): ScanResult {
      const paramsStr = params ? JSON.stringify(params).slice(0, 2000) : "";
      if (paramsStr.includes("api.halt.dev") || paramsStr.includes("/api/rules")) {
        return EMPTY;
      }
      return buildResult(scanText(`${toolName} ${paramsStr}`, inputPatterns));
    },

    scanOutput(toolName: string, result: unknown): ScanResult {
      const text = typeof result === "string" ? result : JSON.stringify(result || "").slice(0, 5000);
      return buildResult(scanText(text, patterns));
    },
  };
}

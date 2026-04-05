export { ShieldScanner } from "./scanner.js";
export type { ShieldConfig, ShieldResult } from "./scanner.js";
export {
  SHIELD_PATTERNS,
  SHIELD_CATEGORIES,
  getPatternsByTier,
  getPatternsByCategory,
} from "./patterns.js";
export type {
  ShieldPattern,
  ShieldDetection,
  ShieldTier,
} from "./patterns.js";
export { deepScan } from "./deep-scan.js";

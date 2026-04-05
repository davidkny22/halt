export const API_KEY_PREFIX = "clw_live_";

export const MAX_FREE_RULES = 3;

export const DEFAULT_SPEND_LIMIT = 100;
export const DEFAULT_RATE_LIMIT = 120;

export const CACHE_SIZE_LIMIT = 50 * 1024 * 1024; // 50MB
export const CACHE_AGE_LIMIT = 7 * 24 * 60 * 60 * 1000; // 7 days

export const EVENT_BATCH_SIZE = 50;
export const EVENT_BATCH_INTERVAL_MS = 5000; // 5 seconds

export const WS_HEARTBEAT_INTERVAL_MS = 30_000;
export const WS_RECONNECT_BASE_MS = 1000;
export const WS_RECONNECT_MAX_MS = 60_000;

export const FREE_RETENTION_DAYS = 7;
export const PAID_RETENTION_DAYS = 90;

export const BASELINE_LEARNING_HOURS = 72;

export const ANOMALY_CHECK_INTERVAL_MINUTES = 15;
export const NL_EVAL_INTERVAL_MINUTES = 5;

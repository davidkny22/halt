interface Bucket {
  tokens: number;
  lastRefill: number;
}

const EVICTION_INTERVAL_MS = 5 * 60_000; // 5 minutes
const STALE_THRESHOLD_MS = 5 * 60_000;

export class RateLimiter {
  private buckets = new Map<string, Bucket>();
  private rate: number;
  private burst: number;
  private evictionTimer: ReturnType<typeof setInterval> | null = null;

  constructor(rate: number = 1000, burst: number = 1000) {
    this.rate = rate; // tokens per minute
    this.burst = burst;

    // Periodically evict stale buckets to prevent memory leak
    this.evictionTimer = setInterval(() => this.evict(), EVICTION_INTERVAL_MS);
    if (this.evictionTimer.unref) this.evictionTimer.unref();
  }

  consume(key: string, count: number = 1): boolean {
    const now = Date.now();
    let bucket = this.buckets.get(key);

    if (!bucket) {
      bucket = { tokens: this.burst, lastRefill: now };
      this.buckets.set(key, bucket);
    }

    // Refill tokens based on elapsed time
    const elapsed = (now - bucket.lastRefill) / 60_000; // minutes
    bucket.tokens = Math.min(this.burst, bucket.tokens + elapsed * this.rate);
    bucket.lastRefill = now;

    if (bucket.tokens >= count) {
      bucket.tokens -= count;
      return true;
    }

    return false;
  }

  reset(key: string): void {
    this.buckets.delete(key);
  }

  shutdown(): void {
    if (this.evictionTimer) {
      clearInterval(this.evictionTimer);
      this.evictionTimer = null;
    }
  }

  private evict(): void {
    const now = Date.now();
    for (const [key, bucket] of this.buckets) {
      if (bucket.tokens >= this.burst && now - bucket.lastRefill > STALE_THRESHOLD_MS) {
        this.buckets.delete(key);
      }
    }
  }
}

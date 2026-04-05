interface Bucket {
  tokens: number;
  lastRefill: number;
}

export class RateLimiter {
  private buckets = new Map<string, Bucket>();
  private rate: number;
  private burst: number;

  constructor(rate: number = 1000, burst: number = 1000) {
    this.rate = rate; // tokens per minute
    this.burst = burst;
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
}

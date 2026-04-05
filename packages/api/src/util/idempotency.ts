const MAX_SET_SIZE = 10_000;

export class IdempotencyChecker {
  private seen = new Set<string>();

  isDuplicate(eventId: string): boolean {
    if (this.seen.has(eventId)) {
      return true;
    }

    this.seen.add(eventId);

    // Evict batch when set gets too large (not just one)
    if (this.seen.size > MAX_SET_SIZE) {
      const evictCount = Math.floor(MAX_SET_SIZE * 0.2); // Drop 20%
      const iter = this.seen.values();
      for (let i = 0; i < evictCount; i++) {
        const val = iter.next().value;
        if (val) this.seen.delete(val);
      }
    }

    return false;
  }

  clear(): void {
    this.seen.clear();
  }
}

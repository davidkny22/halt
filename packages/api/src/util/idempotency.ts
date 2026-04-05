const MAX_SET_SIZE = 10_000;

export class IdempotencyChecker {
  private seen = new Set<string>();

  isDuplicate(eventId: string): boolean {
    if (this.seen.has(eventId)) {
      return true;
    }

    this.seen.add(eventId);

    // Evict oldest when set gets too large
    if (this.seen.size > MAX_SET_SIZE) {
      const first = this.seen.values().next().value;
      if (first) this.seen.delete(first);
    }

    return false;
  }

  clear(): void {
    this.seen.clear();
  }
}

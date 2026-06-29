/**
 * In-memory cache for fallback data.
 */

interface CacheEntry<T> {
  value: T;
  storedAt: number;
  ttlMs: number;
}

export class FallbackCache<T = unknown> {
  private readonly store = new Map<string, CacheEntry<T>>();
  private readonly defaultTtlMs: number;

  constructor(defaultTtlMinutes: number = 30) {
    // Step 1: Convert minutes to milliseconds
    this.defaultTtlMs = defaultTtlMinutes * 60 * 1000;
  }

  /**
   * Store a value with optional custom TTL.
   */
  set(key: string, value: T, ttlMs?: number): void {
    // Step 1: Create cache entry with timestamp
    this.store.set(key, {
      value,
      storedAt: Date.now(),
      ttlMs: ttlMs ?? this.defaultTtlMs,
    });
  }

  /**
   * Retrieve a cached value if it exists and hasn't expired.
   */
  get(key: string): T | null {
    // Step 1: Look up entry
    const entry = this.store.get(key);
    if (!entry) {
      return null;
    }

    // Step 2: Check TTL expiry
    if (Date.now() - entry.storedAt > entry.ttlMs) {
      this.store.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * Check if a key exists and is not expired.
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Remove all expired entries.
   */
  prune(): number {
    const now = Date.now();
    let pruned = 0;

    // Step 1: Iterate and remove stale entries
    for (const [key, entry] of this.store) {
      if (now - entry.storedAt > entry.ttlMs) {
        this.store.delete(key);
        pruned++;
      }
    }

    return pruned;
  }

  /**
   * Get total number of entries (including potentially expired).
   */
  get size(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }
}

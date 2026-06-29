/**
 * Stale data detection and handling.
 */


export interface StalenessReport {
  key: string;
  ageMinutes: number;
  thresholdMinutes: number;
  isStale: boolean;
  lastRefreshedAt: Date;
}

export class StalenessDetector {
  private readonly thresholdMinutes: number;
  private readonly timestamps = new Map<string, number>();

  constructor(thresholdMinutes: number = 30) {
    // Step 1: Store staleness threshold
    this.thresholdMinutes = thresholdMinutes;
  }

  /**
   * Record a data refresh for the given key.
   */
  markRefreshed(key: string): void {
    this.timestamps.set(key, Date.now());
  }

  /**
   * Check if data for a given key is stale.
   */
  isStale(key: string): boolean {
    // Step 1: Look up last refresh time
    const lastRefresh = this.timestamps.get(key);
    if (lastRefresh === undefined) {
      return true;
    }

    // Step 2: Compare against threshold
    const ageMs = Date.now() - lastRefresh;
    return ageMs >= this.thresholdMinutes * 60 * 1000;
  }

  /**
   * Generate a staleness report for a specific key.
   */
  report(key: string): StalenessReport {
    const lastRefresh = this.timestamps.get(key);
    const now = Date.now();

    // Step 1: Calculate age
    const ageMs = lastRefresh !== undefined ? now - lastRefresh : Infinity;
    const ageMinutes = Math.floor(ageMs / (60 * 1000));

    return {
      key,
      ageMinutes: isFinite(ageMinutes) ? ageMinutes : -1,
      thresholdMinutes: this.thresholdMinutes,
      isStale: ageMs >= this.thresholdMinutes * 60 * 1000,
      lastRefreshedAt: lastRefresh !== undefined ? new Date(lastRefresh) : new Date(0),
    };
  }

  /**
   * List all keys that are currently stale.
   */
  staleKeys(): string[] {
    // Step 1: Filter all tracked keys by staleness
    const stale: string[] = [];
    for (const key of this.timestamps.keys()) {
      if (this.isStale(key)) {
        stale.push(key);
      }
    }
    return stale;
  }
}

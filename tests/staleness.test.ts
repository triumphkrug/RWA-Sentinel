/**
 * Comprehensive tests for StalenessDetector — threshold, reporting, edge cases.
 */

import { StalenessDetector } from '../agent/src/fallback/staleness';

describe('StalenessDetector', () => {
  // ======== Basic behavior ========

  test('unknown key is always stale', () => {
    const detector = new StalenessDetector(30);
    expect(detector.isStale('unknown')).toBe(true);
  });

  test('freshly marked key is not stale', () => {
    const detector = new StalenessDetector(30);
    detector.markRefreshed('key1');
    expect(detector.isStale('key1')).toBe(false);
  });

  test('key becomes stale after threshold', () => {
    const detector = new StalenessDetector(0); // 0 min threshold = immediately stale
    detector.markRefreshed('key1');
    expect(detector.isStale('key1')).toBe(true);
  });

  // ======== report() ========

  test('report for unknown key shows stale with age -1', () => {
    const detector = new StalenessDetector(30);
    const report = detector.report('missing');
    expect(report.isStale).toBe(true);
    expect(report.ageMinutes).toBe(-1);
    expect(report.key).toBe('missing');
    expect(report.thresholdMinutes).toBe(30);
  });

  test('report for fresh key shows not stale', () => {
    const detector = new StalenessDetector(30);
    detector.markRefreshed('fresh');
    const report = detector.report('fresh');
    expect(report.isStale).toBe(false);
    expect(report.ageMinutes).toBe(0); // just refreshed
    expect(report.lastRefreshedAt).toBeInstanceOf(Date);
  });

  test('report for stale key with 0 threshold', () => {
    const detector = new StalenessDetector(0);
    detector.markRefreshed('stale');
    const report = detector.report('stale');
    expect(report.isStale).toBe(true);
    expect(report.thresholdMinutes).toBe(0);
  });

  // ======== staleKeys() ========

  test('staleKeys returns empty for fresh data', () => {
    const detector = new StalenessDetector(30);
    detector.markRefreshed('a');
    detector.markRefreshed('b');
    expect(detector.staleKeys()).toEqual([]);
  });

  test('staleKeys returns all when threshold is 0', () => {
    const detector = new StalenessDetector(0);
    detector.markRefreshed('a');
    detector.markRefreshed('b');
    detector.markRefreshed('c');
    const stale = detector.staleKeys();
    expect(stale.length).toBe(3);
    expect(stale).toContain('a');
    expect(stale).toContain('b');
    expect(stale).toContain('c');
  });

  // ======== markRefreshed resets staleness ========

  test('marking refreshed resets the timer', () => {
    const detector = new StalenessDetector(30);
    detector.markRefreshed('key');
    expect(detector.isStale('key')).toBe(false);
    // Re-mark should still be fresh
    detector.markRefreshed('key');
    expect(detector.isStale('key')).toBe(false);
  });

  // ======== Edge cases ========

  test('default threshold is 30 minutes', () => {
    const detector = new StalenessDetector();
    const report = detector.report('x');
    expect(report.thresholdMinutes).toBe(30);
  });

  test('handles many keys', () => {
    const detector = new StalenessDetector(30);
    for (let i = 0; i < 100; i++) {
      detector.markRefreshed(`key-${i}`);
    }
    expect(detector.staleKeys().length).toBe(0);
  });
});

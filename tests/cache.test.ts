/**
 * Comprehensive tests for FallbackCache — all TTL, eviction, and edge cases.
 */

import { FallbackCache } from '../agent/src/fallback/cache';

describe('FallbackCache', () => {
  let cache: FallbackCache<string>;

  beforeEach(() => {
    cache = new FallbackCache<string>(30); // 30 min default TTL
  });

  // ======== Basic CRUD ========

  test('should store and retrieve values', () => {
    cache.set('key1', 'value1');
    expect(cache.get('key1')).toBe('value1');
  });

  test('should return null for missing keys', () => {
    expect(cache.get('nonexistent')).toBeNull();
  });

  test('should overwrite existing values', () => {
    cache.set('key', 'old');
    cache.set('key', 'new');
    expect(cache.get('key')).toBe('new');
  });

  test('should report correct size', () => {
    cache.set('a', '1');
    cache.set('b', '2');
    cache.set('c', '3');
    expect(cache.size).toBe(3);
  });

  test('should clear all entries', () => {
    cache.set('a', '1');
    cache.set('b', '2');
    cache.clear();
    expect(cache.size).toBe(0);
    expect(cache.get('a')).toBeNull();
  });

  // ======== TTL behavior ========

  test('should return value within TTL', () => {
    cache.set('fresh', 'data');
    // Immediately retrieving should work
    expect(cache.get('fresh')).toBe('data');
  });

  test('should return null for expired entries', () => {
    // Use tiny custom TTL (1ms)
    cache.set('expire-soon', 'data', 1);
    // Wait a bit
    const start = Date.now();
    while (Date.now() - start < 5) {
      // busy wait
    }
    expect(cache.get('expire-soon')).toBeNull();
  });

  test('should delete expired entry on get', () => {
    cache.set('auto-delete', 'data', 1);
    const start = Date.now();
    while (Date.now() - start < 5) {}
    cache.get('auto-delete'); // triggers deletion
    expect(cache.size).toBe(0);
  });

  // ======== has() ========

  test('has returns true for existing non-expired key', () => {
    cache.set('exists', 'yes');
    expect(cache.has('exists')).toBe(true);
  });

  test('has returns false for missing key', () => {
    expect(cache.has('nope')).toBe(false);
  });

  test('has returns false for expired key', () => {
    cache.set('expired', 'data', 1);
    const start = Date.now();
    while (Date.now() - start < 5) {}
    expect(cache.has('expired')).toBe(false);
  });

  // ======== prune() ========

  test('prune removes expired entries', () => {
    cache.set('a', '1', 1); // expires immediately
    cache.set('b', '2', 1);
    cache.set('c', '3'); // default TTL (30 min)
    const start = Date.now();
    while (Date.now() - start < 5) {}
    const pruned = cache.prune();
    expect(pruned).toBe(2);
    expect(cache.size).toBe(1);
    expect(cache.get('c')).toBe('3');
  });

  test('prune returns 0 when nothing expired', () => {
    cache.set('a', '1');
    const pruned = cache.prune();
    expect(pruned).toBe(0);
  });

  // ======== Edge cases ========

  test('should handle empty string key', () => {
    cache.set('', 'empty-key');
    expect(cache.get('')).toBe('empty-key');
  });

  test('should handle empty string value', () => {
    cache.set('key', '');
    expect(cache.get('key')).toBe('');
  });

  test('should handle object values with generic type', () => {
    const objCache = new FallbackCache<{ score: number }>(30);
    objCache.set('item', { score: 95 });
    expect(objCache.get('item')?.score).toBe(95);
  });
});

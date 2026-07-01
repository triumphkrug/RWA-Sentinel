/**
 * Comprehensive tests for BatchNftMinter — minting, validation, expiry, pruning.
 */

import { BatchNftMinter } from '../agent/src/publisher/batchNftMinter';

describe('BatchNftMinter', () => {
  let minter: BatchNftMinter;

  beforeEach(() => {
    minter = new BatchNftMinter({ validityHours: 24 });
  });

  // ======== Minting ========

  test('should mint an NFT with correct fields', () => {
    const nft = minter.mintBatchNft('BATCH-1', ['INV-A', 'INV-B']);
    expect(nft.batchId).toBe('BATCH-1');
    expect(nft.active).toBe(true);
    expect(nft.metadataHash).toHaveLength(64);
    expect(nft.createdAt).toBeInstanceOf(Date);
    expect(nft.validUntil).toBeInstanceOf(Date);
  });

  test('should set validity window correctly', () => {
    const nft = minter.mintBatchNft('BATCH-V', ['INV-1']);
    const diff = nft.validUntil.getTime() - nft.createdAt.getTime();
    const hours = diff / (1000 * 60 * 60);
    expect(hours).toBeCloseTo(24, 0);
  });

  test('should produce deterministic hashes for same assets', () => {
    const nft1 = minter.mintBatchNft('B1', ['A', 'B']);
    const minter2 = new BatchNftMinter({ validityHours: 24 });
    const nft2 = minter2.mintBatchNft('B2', ['A', 'B']);
    expect(nft1.metadataHash).toBe(nft2.metadataHash);
  });

  test('should produce different hashes for different assets', () => {
    const nft1 = minter.mintBatchNft('B1', ['A', 'B']);
    const nft2 = minter.mintBatchNft('B2', ['C', 'D']);
    expect(nft1.metadataHash).not.toBe(nft2.metadataHash);
  });

  // ======== Validation ========

  test('newly minted NFT is valid', () => {
    minter.mintBatchNft('BATCH-VALID', ['INV-1']);
    expect(minter.isValid('BATCH-VALID')).toBe(true);
  });

  test('unknown batch is not valid', () => {
    expect(minter.isValid('NONEXISTENT')).toBe(false);
  });

  test('invalidated NFT is not valid', () => {
    minter.mintBatchNft('BATCH-INV', ['INV-1']);
    minter.invalidate('BATCH-INV');
    expect(minter.isValid('BATCH-INV')).toBe(false);
  });

  // ======== Invalidation ========

  test('invalidate returns updated NFT status', () => {
    minter.mintBatchNft('B-1', ['INV-1']);
    const result = minter.invalidate('B-1');
    expect(result).not.toBeNull();
    expect(result!.active).toBe(false);
  });

  test('invalidate returns null for unknown batch', () => {
    const result = minter.invalidate('UNKNOWN');
    expect(result).toBeNull();
  });

  test('double invalidation still returns inactive', () => {
    minter.mintBatchNft('B-DBL', ['INV-1']);
    minter.invalidate('B-DBL');
    const result = minter.invalidate('B-DBL');
    expect(result).not.toBeNull();
    expect(result!.active).toBe(false);
  });

  // ======== Expiry ========

  test('expired NFT is not valid', () => {
    // Use 0 validity hours → expires immediately
    const fastMinter = new BatchNftMinter({ validityHours: 0 });
    fastMinter.mintBatchNft('EXPIRED', ['INV-1']);
    expect(fastMinter.isValid('EXPIRED')).toBe(false);
  });

  // ======== Pruning ========

  test('pruneExpired marks expired NFTs inactive', () => {
    const fastMinter = new BatchNftMinter({ validityHours: 0 });
    fastMinter.mintBatchNft('E1', ['INV-1']);
    fastMinter.mintBatchNft('E2', ['INV-2']);
    const pruned = fastMinter.pruneExpired();
    expect(pruned).toBe(2);
  });

  test('pruneExpired returns 0 when none expired', () => {
    minter.mintBatchNft('FRESH', ['INV-1']);
    const pruned = minter.pruneExpired();
    expect(pruned).toBe(0);
  });

  test('prune does not affect active NFTs', () => {
    minter.mintBatchNft('ACTIVE', ['INV-1']);
    minter.pruneExpired();
    expect(minter.isValid('ACTIVE')).toBe(true);
  });

  // ======== Edge cases ========

  test('mint with empty assets list', () => {
    const nft = minter.mintBatchNft('EMPTY', []);
    expect(nft.metadataHash).toHaveLength(64);
    expect(nft.active).toBe(true);
  });

  test('mint with single asset', () => {
    const nft = minter.mintBatchNft('SINGLE', ['INV-ONLY']);
    expect(nft.active).toBe(true);
  });

  test('mint with many assets', () => {
    const ids = Array.from({ length: 100 }, (_, i) => `INV-${i}`);
    const nft = minter.mintBatchNft('LARGE', ids);
    expect(nft.active).toBe(true);
    expect(nft.metadataHash).toHaveLength(64);
  });

  test('custom validity hours', () => {
    const shortMinter = new BatchNftMinter({ validityHours: 1 });
    const nft = shortMinter.mintBatchNft('SHORT', ['INV-1']);
    const diff = nft.validUntil.getTime() - nft.createdAt.getTime();
    const hours = diff / (1000 * 60 * 60);
    expect(hours).toBeCloseTo(1, 0);
  });

  test('default config uses 24 hours', () => {
    const defaultMinter = new BatchNftMinter();
    const nft = defaultMinter.mintBatchNft('DEF', ['INV-1']);
    const diff = nft.validUntil.getTime() - nft.createdAt.getTime();
    const hours = diff / (1000 * 60 * 60);
    expect(hours).toBeCloseTo(24, 0);
  });
});

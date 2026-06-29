/**
 * Batch NFT minting for invoice attestations.
 */

import { createHash } from 'node:crypto';
import type { NftStatus } from './types.js';

interface NftMintConfig {
  validityHours: number;
}

const DEFAULT_NFT_CONFIG: NftMintConfig = {
  validityHours: 24,
};

export class BatchNftMinter {
  private readonly config: NftMintConfig;
  private readonly mintedNfts = new Map<string, NftStatus>();

  constructor(config?: Partial<NftMintConfig>) {
    // Step 1: Merge with default config
    this.config = { ...DEFAULT_NFT_CONFIG, ...config };
  }

  /**
   * Mint a batch NFT representing a group of attested invoices.
   * The NFT auto-expires after the configured validity period.
   */
  mintBatchNft(batchId: string, assetIds: string[]): NftStatus {
    // Step 1: Compute metadata hash for the batch
    const metadataHash = createHash('sha256').update(assetIds.join(',')).digest('hex');

    // Step 2: Calculate validity window
    const now = new Date();
    const validUntil = new Date(now.getTime() + this.config.validityHours * 60 * 60 * 1000);

    // Step 3: Create NFT status record
    const nftStatus: NftStatus = {
      metadataHash,
      batchId,
      active: true,
      createdAt: now,
      validUntil,
    };

    // Step 4: Store in local registry
    this.mintedNfts.set(batchId, nftStatus);

    return nftStatus;
  }

  /**
   * Invalidate an NFT that has been challenged or expired.
   */
  invalidate(batchId: string): NftStatus | null {
    // Step 1: Look up NFT
    const nft = this.mintedNfts.get(batchId);
    if (!nft) {
      return null;
    }

    // Step 2: Mark as inactive
    nft.active = false;
    return nft;
  }

  /**
   * Check if a batch NFT is still active and within validity window.
   */
  isValid(batchId: string): boolean {
    // Step 1: Look up and check
    const nft = this.mintedNfts.get(batchId);
    if (!nft || !nft.active) {
      return false;
    }

    // Step 2: Check expiry
    return new Date() < nft.validUntil;
  }

  /**
   * Prune all expired NFTs from the local registry.
   */
  pruneExpired(): number {
    const now = new Date();
    let pruned = 0;

    // Step 1: Iterate and remove expired entries
    for (const [_batchId, nft] of this.mintedNfts) {
      if (now >= nft.validUntil) {
        nft.active = false;
        pruned++;
      }
    }

    return pruned;
  }
}

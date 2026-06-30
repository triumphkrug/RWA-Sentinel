/**
 * Types for the publisher module.
 */

export interface PublishRequest {
  assetIds: string[];
  trustScores: number[];
  factorsHashes: string[];
  evidenceHashes: string[];
}

export interface PublishResult {
  batchId: string;
  transactionHash: string;
  publishedAt: Date;
  invoiceCount: number;
  status: 'submitted' | 'confirmed' | 'failed';
}

export interface NftStatus {
  metadataHash: string;
  batchId: string;
  active: boolean;
  createdAt: Date;
  validUntil: Date;
}

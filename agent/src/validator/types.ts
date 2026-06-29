/**
 * Types for the validator module.
 */

export interface ScoringFactor {
  name: string;
  weight: number;
  score: number;
  evidence: string;
}

export interface ScoringResult {
  invoiceId: string;
  trustScore: number;
  factors: ScoringFactor[];
  factorsHash: string;
  evidenceHash: string;
  scoredAt: Date;
  isAboveThreshold: boolean;
}

export interface ScoringConfig {
  trustThreshold: number;
  maxFactors: number;
}

export interface CrossRefResult {
  invoiceId: string;
  crossRefPassed: boolean;
  matchedSources: string[];
  conflictingSources: string[];
}

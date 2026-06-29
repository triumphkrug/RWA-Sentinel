/**
 * Local AI scoring model using weighted factor analysis.
 */

import { createHash } from 'node:crypto';
import type { CollectedInvoice } from '../collector/types.js';
import type { ScoringConfig, ScoringFactor, ScoringResult } from './types.js';
import { DEFAULT_FACTORS, type FactorContext, type FactorDefinition } from './scoringFactors.js';

const DEFAULT_CONFIG: ScoringConfig = {
  trustThreshold: 60,
  maxFactors: 10,
};

export class LocalScorer {
  private readonly config: ScoringConfig;
  private readonly factors: FactorDefinition[];

  constructor(config?: Partial<ScoringConfig>, factors?: FactorDefinition[]) {
    // Step 1: Merge configuration with defaults
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.factors = factors ?? DEFAULT_FACTORS;
  }

  /**
   * Score a single collected invoice against all registered factors.
   */
  scoreInvoice(collected: CollectedInvoice): ScoringResult {
    // Step 1: Build factor context from invoice data
    const invoice = collected.invoice;
    const now = new Date();
    const factorContext: FactorContext = {
      issuerHistoryCount: this.lookupIssuerHistory(invoice.issuer),
      debtorHistoryCount: this.lookupDebtorHistory(invoice.debtor),
      amountCents: invoice.amountCents,
      daysSinceIssued: this.daysBetween(invoice.issuedAt, now),
      daysUntilDue: this.daysBetween(now, invoice.dueAt),
      lineItemCount: invoice.lineItems.length,
      hasCrossRef: false,
    };

    // Step 2: Evaluate each factor
    const scoredFactors: ScoringFactor[] = this.factors.map((factorDef) => ({
      name: factorDef.name,
      weight: factorDef.weight,
      score: Math.max(0, Math.min(100, factorDef.evaluator(factorContext))),
      evidence: `${factorDef.id}:${factorDef.evaluator(factorContext)}`,
    }));

    // Step 3: Compute weighted trust score
    const totalWeight = scoredFactors.reduce((sum, f) => sum + f.weight, 0);
    const weightedSum = scoredFactors.reduce((sum, f) => sum + f.score * f.weight, 0);
    const trustScore = Math.round(totalWeight > 0 ? weightedSum / totalWeight : 0);

    // Step 4: Hash factors and evidence for on-chain anchoring
    const factorsHash = this.hashFactors(scoredFactors);
    const evidenceHash = this.hashEvidence(collected.rawHash, factorsHash);

    // Step 5: Build and return result
    return {
      invoiceId: collected.invoiceId,
      trustScore,
      factors: scoredFactors,
      factorsHash,
      evidenceHash,
      scoredAt: new Date(),
      isAboveThreshold: trustScore >= this.config.trustThreshold,
    };
  }

  /**
   * Score a batch of collected invoices.
   */
  scoreBatch(collected: CollectedInvoice[]): ScoringResult[] {
    // Step 1: Score each invoice independently
    return collected.map((inv) => this.scoreInvoice(inv));
  }

  private hashFactors(factors: ScoringFactor[]): string {
    const payload = factors.map((f) => `${f.name}:${f.score}:${f.weight}`).join('|');
    return createHash('sha256').update(payload).digest('hex');
  }

  private hashEvidence(rawHash: string, factorsHash: string): string {
    return createHash('sha256').update(`${rawHash}:${factorsHash}`).digest('hex');
  }

  private daysBetween(a: Date, b: Date): number {
    const diffMs = new Date(b).getTime() - new Date(a).getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  private lookupIssuerHistory(_issuer: string): number {
    // Step 1: In production, query on-chain history
    // Step 2: For MVP, return demo value
    return 10;
  }

  private lookupDebtorHistory(_debtor: string): number {
    return 5;
  }
}

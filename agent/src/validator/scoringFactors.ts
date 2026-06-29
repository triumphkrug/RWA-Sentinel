/**
 * Scoring factor definitions and weight configuration.
 */

export interface FactorDefinition {
  id: string;
  name: string;
  weight: number;
  description: string;
  evaluator: (context: FactorContext) => number;
}

export interface FactorContext {
  issuerHistoryCount: number;
  debtorHistoryCount: number;
  amountCents: number;
  daysSinceIssued: number;
  daysUntilDue: number;
  lineItemCount: number;
  hasCrossRef: boolean;
}

/**
 * Default scoring factors for invoice trust evaluation.
 * Weights must sum to 1.0 across all active factors.
 */
export const DEFAULT_FACTORS: FactorDefinition[] = [
  {
    id: 'issuer_history',
    name: 'Issuer History',
    weight: 0.25,
    description: 'Historical reliability of the invoice issuer',
    evaluator: (ctx) => {
      // Step 1: Score based on number of past successful invoices
      if (ctx.issuerHistoryCount >= 50) return 100;
      if (ctx.issuerHistoryCount >= 20) return 80;
      if (ctx.issuerHistoryCount >= 5) return 60;
      if (ctx.issuerHistoryCount >= 1) return 40;
      return 20;
    },
  },
  {
    id: 'debtor_rating',
    name: 'Debtor Rating',
    weight: 0.2,
    description: 'Payment track record of the debtor',
    evaluator: (ctx) => {
      // Step 1: Score based on debtor payment history
      if (ctx.debtorHistoryCount >= 30) return 95;
      if (ctx.debtorHistoryCount >= 10) return 75;
      if (ctx.debtorHistoryCount >= 3) return 55;
      return 30;
    },
  },
  {
    id: 'amount_range',
    name: 'Amount Reasonableness',
    weight: 0.15,
    description: 'Whether the invoice amount falls within expected ranges',
    evaluator: (ctx) => {
      // Step 1: Penalize extremely high or low amounts
      const usd = ctx.amountCents / 100;
      if (usd < 10) return 30;
      if (usd > 1_000_000) return 40;
      if (usd > 100_000) return 70;
      return 90;
    },
  },
  {
    id: 'time_validity',
    name: 'Time Validity',
    weight: 0.15,
    description: 'Whether the due date and issue date are reasonable',
    evaluator: (ctx) => {
      // Step 1: Check freshness
      if (ctx.daysSinceIssued > 180) return 20;
      if (ctx.daysSinceIssued > 90) return 50;
      // Step 2: Check due date is in the future
      if (ctx.daysUntilDue < 0) return 10;
      if (ctx.daysUntilDue < 7) return 60;
      return 90;
    },
  },
  {
    id: 'detail_level',
    name: 'Invoice Detail Level',
    weight: 0.1,
    description: 'Completeness of line items and metadata',
    evaluator: (ctx) => {
      // Step 1: More line items usually indicate real invoices
      if (ctx.lineItemCount >= 5) return 95;
      if (ctx.lineItemCount >= 2) return 80;
      if (ctx.lineItemCount === 1) return 60;
      return 20;
    },
  },
  {
    id: 'cross_reference',
    name: 'Cross-Reference Check',
    weight: 0.15,
    description: 'Whether invoice data matches external sources',
    evaluator: (ctx) => {
      // Step 1: Binary check — did cross-ref pass?
      return ctx.hasCrossRef ? 95 : 35;
    },
  },
];

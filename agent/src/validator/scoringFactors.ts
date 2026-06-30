/**
 * Default scoring factor definitions for invoice validation.
 *
 * Each factor defines a name, weight, and evaluator function that receives
 * a FactorContext and returns a score from 0 to 100.
 */

// Step 1: Define the context shape for factor evaluation
export interface FactorContext {
  issuerHistoryCount: number;
  debtorHistoryCount: number;
  amountCents: number;
  daysSinceIssued: number;
  daysUntilDue: number;
  lineItemCount: number;
  hasCrossRef: boolean;
}

// Step 2: Define the factor interface
export interface FactorDefinition {
  id: string;
  name: string;
  weight: number;
  evaluator: (ctx: FactorContext) => number;
}

// Step 3: Build default factor set matching the README weights
export const DEFAULT_FACTORS: FactorDefinition[] = [
  {
    id: 'issuer_history',
    name: 'Issuer History',
    weight: 25,
    evaluator: (ctx: FactorContext): number => {
      // Step 1: More history → higher trust, cap at 20 entries
      return Math.min(100, ctx.issuerHistoryCount * 5);
    },
  },
  {
    id: 'debtor_rating',
    name: 'Debtor Rating',
    weight: 20,
    evaluator: (ctx: FactorContext): number => {
      // Step 1: More history → higher trust, cap at 10 entries
      return Math.min(100, ctx.debtorHistoryCount * 10);
    },
  },
  {
    id: 'amount_reasonableness',
    name: 'Amount Reasonableness',
    weight: 15,
    evaluator: (ctx: FactorContext): number => {
      // Step 1: Flag unusually large amounts (above 1M cents = $10K)
      if (ctx.amountCents <= 0) return 0;
      if (ctx.amountCents > 10_000_000) return 30;
      if (ctx.amountCents > 1_000_000) return 60;
      return 90;
    },
  },
  {
    id: 'time_validity',
    name: 'Time Validity',
    weight: 15,
    evaluator: (ctx: FactorContext): number => {
      // Step 1: Penalize old invoices (> 90 days since issued)
      if (ctx.daysSinceIssued > 90) return 20;
      // Step 2: Penalize near-due or overdue invoices
      if (ctx.daysUntilDue < 0) return 10;
      if (ctx.daysUntilDue < 7) return 50;
      return 85;
    },
  },
  {
    id: 'detail_level',
    name: 'Invoice Detail Level',
    weight: 10,
    evaluator: (ctx: FactorContext): number => {
      // Step 1: More line items suggest a more detailed invoice
      if (ctx.lineItemCount === 0) return 10;
      if (ctx.lineItemCount < 3) return 50;
      return 80;
    },
  },
  {
    id: 'cross_reference',
    name: 'Cross-Reference Check',
    weight: 15,
    evaluator: (ctx: FactorContext): number => {
      // Step 1: Binary check for external corroboration
      return ctx.hasCrossRef ? 90 : 40;
    },
  },
];

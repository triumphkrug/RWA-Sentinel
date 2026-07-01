/**
 * Comprehensive tests for scoring factor evaluators — all boundary conditions.
 */

import { DEFAULT_FACTORS, type FactorContext } from '../agent/src/validator/scoringFactors';

function getEvaluator(factorId: string) {
  const factor = DEFAULT_FACTORS.find((f) => f.id === factorId);
  if (!factor) throw new Error(`Factor ${factorId} not found`);
  return factor.evaluator;
}

function baseContext(): FactorContext {
  return {
    issuerHistoryCount: 10,
    debtorHistoryCount: 5,
    amountCents: 50000,
    daysSinceIssued: 15,
    daysUntilDue: 30,
    lineItemCount: 3,
    hasCrossRef: true,
  };
}

describe('ScoringFactors', () => {
  // ======== Factor configuration ========

  test('should have 6 default factors', () => {
    expect(DEFAULT_FACTORS.length).toBe(6);
  });

  test('total weights should sum to 100', () => {
    const totalWeight = DEFAULT_FACTORS.reduce((sum, f) => sum + f.weight, 0);
    expect(totalWeight).toBe(100);
  });

  test('all factors have required fields', () => {
    for (const factor of DEFAULT_FACTORS) {
      expect(factor.id).toBeTruthy();
      expect(factor.name).toBeTruthy();
      expect(factor.weight).toBeGreaterThan(0);
      expect(typeof factor.evaluator).toBe('function');
    }
  });

  // ======== Issuer History (weight: 25) ========

  describe('Issuer History', () => {
    const evaluate = getEvaluator('issuer_history');

    test('zero history → score 0', () => {
      expect(evaluate({ ...baseContext(), issuerHistoryCount: 0 })).toBe(0);
    });

    test('1 history → score 5', () => {
      expect(evaluate({ ...baseContext(), issuerHistoryCount: 1 })).toBe(5);
    });

    test('10 history → score 50', () => {
      expect(evaluate({ ...baseContext(), issuerHistoryCount: 10 })).toBe(50);
    });

    test('20+ history → capped at 100', () => {
      expect(evaluate({ ...baseContext(), issuerHistoryCount: 20 })).toBe(100);
      expect(evaluate({ ...baseContext(), issuerHistoryCount: 50 })).toBe(100);
    });
  });

  // ======== Debtor Rating (weight: 20) ========

  describe('Debtor Rating', () => {
    const evaluate = getEvaluator('debtor_rating');

    test('zero history → score 0', () => {
      expect(evaluate({ ...baseContext(), debtorHistoryCount: 0 })).toBe(0);
    });

    test('5 history → score 50', () => {
      expect(evaluate({ ...baseContext(), debtorHistoryCount: 5 })).toBe(50);
    });

    test('10+ history → capped at 100', () => {
      expect(evaluate({ ...baseContext(), debtorHistoryCount: 10 })).toBe(100);
      expect(evaluate({ ...baseContext(), debtorHistoryCount: 100 })).toBe(100);
    });
  });

  // ======== Amount Reasonableness (weight: 15) ========

  describe('Amount Reasonableness', () => {
    const evaluate = getEvaluator('amount_reasonableness');

    test('zero or negative → score 0', () => {
      expect(evaluate({ ...baseContext(), amountCents: 0 })).toBe(0);
      expect(evaluate({ ...baseContext(), amountCents: -100 })).toBe(0);
    });

    test('normal amount (under $10K) → score 90', () => {
      expect(evaluate({ ...baseContext(), amountCents: 500000 })).toBe(90); // $5K
    });

    test('large amount ($10K-$100K) → score 60', () => {
      expect(evaluate({ ...baseContext(), amountCents: 5_000_000 })).toBe(60); // $50K
    });

    test('very large amount (>$100K) → score 30', () => {
      expect(evaluate({ ...baseContext(), amountCents: 50_000_000 })).toBe(30); // $500K
    });

    test('boundary: exactly $10K → score 90', () => {
      expect(evaluate({ ...baseContext(), amountCents: 1_000_000 })).toBe(90);
    });

    test('boundary: just over $10K → score 60', () => {
      expect(evaluate({ ...baseContext(), amountCents: 1_000_001 })).toBe(60);
    });
  });

  // ======== Time Validity (weight: 15) ========

  describe('Time Validity', () => {
    const evaluate = getEvaluator('time_validity');

    test('old invoice (>90 days) → score 20', () => {
      expect(evaluate({ ...baseContext(), daysSinceIssued: 91, daysUntilDue: 30 })).toBe(20);
    });

    test('overdue invoice (daysUntilDue < 0) → score 10', () => {
      expect(evaluate({ ...baseContext(), daysSinceIssued: 30, daysUntilDue: -5 })).toBe(10);
    });

    test('near-due invoice (<7 days) → score 50', () => {
      expect(evaluate({ ...baseContext(), daysSinceIssued: 20, daysUntilDue: 3 })).toBe(50);
    });

    test('healthy invoice → score 85', () => {
      expect(evaluate({ ...baseContext(), daysSinceIssued: 15, daysUntilDue: 30 })).toBe(85);
    });

    test('boundary: exactly 7 days → score 85', () => {
      expect(evaluate({ ...baseContext(), daysSinceIssued: 15, daysUntilDue: 7 })).toBe(85);
    });

    test('boundary: exactly 90 days old → score 85', () => {
      expect(evaluate({ ...baseContext(), daysSinceIssued: 90, daysUntilDue: 30 })).toBe(85);
    });
  });

  // ======== Invoice Detail Level (weight: 10) ========

  describe('Invoice Detail Level', () => {
    const evaluate = getEvaluator('detail_level');

    test('no line items → score 10', () => {
      expect(evaluate({ ...baseContext(), lineItemCount: 0 })).toBe(10);
    });

    test('1-2 line items → score 50', () => {
      expect(evaluate({ ...baseContext(), lineItemCount: 1 })).toBe(50);
      expect(evaluate({ ...baseContext(), lineItemCount: 2 })).toBe(50);
    });

    test('3+ line items → score 80', () => {
      expect(evaluate({ ...baseContext(), lineItemCount: 3 })).toBe(80);
      expect(evaluate({ ...baseContext(), lineItemCount: 10 })).toBe(80);
    });
  });

  // ======== Cross-Reference Check (weight: 15) ========

  describe('Cross-Reference Check', () => {
    const evaluate = getEvaluator('cross_reference');

    test('with cross-ref → score 90', () => {
      expect(evaluate({ ...baseContext(), hasCrossRef: true })).toBe(90);
    });

    test('without cross-ref → score 40', () => {
      expect(evaluate({ ...baseContext(), hasCrossRef: false })).toBe(40);
    });
  });
});

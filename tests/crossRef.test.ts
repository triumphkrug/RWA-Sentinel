/**
 * Comprehensive tests for CrossRefChecker — source verification, pass/fail logic.
 */

import { CrossRefChecker } from '../agent/src/validator/crossRef';
import type { RawInvoice } from '../agent/src/collector/types';

function makeInvoice(overrides: Partial<RawInvoice> = {}): RawInvoice {
  return {
    invoiceId: 'INV-TEST',
    issuer: 'Acme Corp',
    debtor: 'BuildCo Ltd',
    amountCents: 50000,
    currencyCode: 'USD',
    issuedAt: new Date('2026-01-01'),
    dueAt: new Date('2026-03-01'),
    lineItems: [{ description: 'Service', quantity: 1, unitPriceCents: 50000 }],
    metadata: {},
    ...overrides,
  };
}

describe('CrossRefChecker', () => {
  // ======== Default sources ========

  test('valid invoice passes all default sources', async () => {
    const checker = new CrossRefChecker();
    const invoice = makeInvoice();
    const result = await checker.check(invoice);
    expect(result.invoiceId).toBe('INV-TEST');
    expect(result.crossRefPassed).toBe(true);
    expect(result.matchedSources.length).toBe(3);
    expect(result.conflictingSources.length).toBe(0);
  });

  test('zero amount fails amount-sanity check', async () => {
    const checker = new CrossRefChecker();
    const invoice = makeInvoice({ amountCents: 0 });
    const result = await checker.check(invoice);
    expect(result.crossRefPassed).toBe(false);
    expect(result.conflictingSources).toContain('amount-sanity');
  });

  test('extremely large amount fails amount-sanity', async () => {
    const checker = new CrossRefChecker();
    const invoice = makeInvoice({ amountCents: 200_000_000 }); // $2M
    const result = await checker.check(invoice);
    expect(result.conflictingSources).toContain('amount-sanity');
  });

  test('empty issuer fails entity-registry', async () => {
    const checker = new CrossRefChecker();
    const invoice = makeInvoice({ issuer: '' });
    const result = await checker.check(invoice);
    expect(result.crossRefPassed).toBe(false);
    expect(result.conflictingSources).toContain('entity-registry');
  });

  test('empty debtor fails entity-registry', async () => {
    const checker = new CrossRefChecker();
    const invoice = makeInvoice({ debtor: '' });
    const result = await checker.check(invoice);
    expect(result.conflictingSources).toContain('entity-registry');
  });

  test('due date before issue date fails date-consistency', async () => {
    const checker = new CrossRefChecker();
    const invoice = makeInvoice({
      issuedAt: new Date('2026-06-01'),
      dueAt: new Date('2026-05-01'),
    });
    const result = await checker.check(invoice);
    expect(result.conflictingSources).toContain('date-consistency');
  });

  test('same issue and due date fails date-consistency', async () => {
    const checker = new CrossRefChecker();
    const sameDate = new Date('2026-06-01');
    const invoice = makeInvoice({
      issuedAt: sameDate,
      dueAt: sameDate,
    });
    const result = await checker.check(invoice);
    expect(result.conflictingSources).toContain('date-consistency');
  });

  // ======== Custom sources ========

  test('custom source that always passes', async () => {
    const checker = new CrossRefChecker([
      { name: 'always-pass', verify: async () => true },
    ]);
    const result = await checker.check(makeInvoice());
    expect(result.crossRefPassed).toBe(true);
    expect(result.matchedSources).toContain('always-pass');
  });

  test('custom source that always fails', async () => {
    const checker = new CrossRefChecker([
      { name: 'always-fail', verify: async () => false },
    ]);
    const result = await checker.check(makeInvoice());
    expect(result.crossRefPassed).toBe(false);
    expect(result.conflictingSources).toContain('always-fail');
  });

  test('mixed custom sources', async () => {
    const checker = new CrossRefChecker([
      { name: 'pass', verify: async () => true },
      { name: 'fail', verify: async () => false },
    ]);
    const result = await checker.check(makeInvoice());
    expect(result.crossRefPassed).toBe(false);
    expect(result.matchedSources).toContain('pass');
    expect(result.conflictingSources).toContain('fail');
  });

  test('empty sources results in no pass (no matched)', async () => {
    const checker = new CrossRefChecker([]);
    const result = await checker.check(makeInvoice());
    // crossRefPassed requires matchedSources.length > 0
    expect(result.crossRefPassed).toBe(false);
  });

  // ======== Error handling ========

  test('rejected promise source is handled gracefully', async () => {
    const checker = new CrossRefChecker([
      {
        name: 'error-source',
        verify: async () => {
          throw new Error('network error');
        },
      },
      { name: 'good-source', verify: async () => true },
    ]);
    const result = await checker.check(makeInvoice());
    // Error source is not in either list (settled as rejected)
    expect(result.matchedSources).toContain('good-source');
    expect(result.conflictingSources).not.toContain('error-source');
    expect(result.matchedSources).not.toContain('error-source');
  });
});

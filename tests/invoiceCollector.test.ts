import { InvoiceCollector } from '../agent/src/collector/invoiceCollector';
import { generateDemoInvoices } from '../agent/src/collector/invoiceGenerator';
import type { RawInvoice } from '../agent/src/collector/types';

describe('InvoiceCollector', () => {
  let collector: InvoiceCollector;

  beforeEach(() => {
    collector = new InvoiceCollector({ batchSize: 5, deduplicateByHash: true });
  });

  test('should collect valid invoices', () => {
    const invoices = generateDemoInvoices(3);
    const collected = collector.collectBatch(invoices);
    expect(collected.length).toBe(3);
    expect(collected[0].source).toBe('api');
  });

  test('should limit batch to configured size', () => {
    const invoices = generateDemoInvoices(10);
    const collected = collector.collectBatch(invoices);
    expect(collected.length).toBeLessThanOrEqual(5);
  });

  test('should deduplicate identical invoices', () => {
    const invoices = generateDemoInvoices(1);
    const batch1 = collector.collectBatch(invoices);
    const batch2 = collector.collectBatch(invoices);
    expect(batch1.length).toBe(1);
    expect(batch2.length).toBe(0);
  });

  test('should skip invoices with zero amount', () => {
    const bad: RawInvoice = {
      invoiceId: 'INV-BAD',
      issuer: 'Test',
      debtor: 'Test',
      amountCents: 0,
      currencyCode: 'USD',
      issuedAt: new Date('2026-01-01'),
      dueAt: new Date('2026-02-01'),
      lineItems: [],
      metadata: {},
    };
    const collected = collector.collectBatch([bad]);
    expect(collected.length).toBe(0);
  });

  test('should skip invoices where due date is before issue date', () => {
    const bad: RawInvoice = {
      invoiceId: 'INV-BAD2',
      issuer: 'Test',
      debtor: 'Test',
      amountCents: 1000,
      currencyCode: 'USD',
      issuedAt: new Date('2026-06-01'),
      dueAt: new Date('2026-05-01'),
      lineItems: [{ description: 'Item', quantity: 1, unitPriceCents: 1000 }],
      metadata: {},
    };
    const collected = collector.collectBatch([bad]);
    expect(collected.length).toBe(0);
  });

  test('should produce deterministic hashes', () => {
    const invoices = generateDemoInvoices(1);
    const hash1 = collector.computeHash(invoices[0]);
    const hash2 = collector.computeHash(invoices[0]);
    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64);
  });
});

import { LocalScorer } from '../agent/src/validator/localScorer';
import { InvoiceCollector } from '../agent/src/collector/invoiceCollector';
import { generateDemoInvoices } from '../agent/src/collector/invoiceGenerator';

describe('LocalScorer', () => {
  let scorer: LocalScorer;
  let collector: InvoiceCollector;

  beforeEach(() => {
    scorer = new LocalScorer({ trustThreshold: 60 });
    collector = new InvoiceCollector({ batchSize: 10 });
  });

  test('should score a valid invoice above threshold', () => {
    const invoices = generateDemoInvoices(1);
    const collected = collector.collectBatch(invoices);
    const result = scorer.scoreInvoice(collected[0]);

    expect(result.trustScore).toBeGreaterThanOrEqual(0);
    expect(result.trustScore).toBeLessThanOrEqual(100);
    expect(result.factors.length).toBeGreaterThan(0);
    expect(result.factorsHash.length).toBe(64);
    expect(result.evidenceHash.length).toBe(64);
  });

  test('should return isAboveThreshold based on score', () => {
    const invoices = generateDemoInvoices(5);
    const collected = collector.collectBatch(invoices);
    const results = scorer.scoreBatch(collected);

    for (const result of results) {
      if (result.trustScore >= 60) {
        expect(result.isAboveThreshold).toBe(true);
      } else {
        expect(result.isAboveThreshold).toBe(false);
      }
    }
  });

  test('should include all six default factors', () => {
    const invoices = generateDemoInvoices(1);
    const collected = collector.collectBatch(invoices);
    const result = scorer.scoreInvoice(collected[0]);

    const factorNames = result.factors.map((f) => f.name);
    expect(factorNames).toContain('Issuer History');
    expect(factorNames).toContain('Debtor Rating');
    expect(factorNames).toContain('Amount Reasonableness');
    expect(factorNames).toContain('Time Validity');
    expect(factorNames).toContain('Invoice Detail Level');
    expect(factorNames).toContain('Cross-Reference Check');
  });

  test('should clamp factor scores to 0-100', () => {
    const invoices = generateDemoInvoices(1);
    const collected = collector.collectBatch(invoices);
    const result = scorer.scoreInvoice(collected[0]);

    for (const factor of result.factors) {
      expect(factor.score).toBeGreaterThanOrEqual(0);
      expect(factor.score).toBeLessThanOrEqual(100);
    }
  });

  test('should produce different hashes for different invoices', () => {
    const invoices = generateDemoInvoices(2);
    const collected = collector.collectBatch(invoices);
    const r1 = scorer.scoreInvoice(collected[0]);
    const r2 = scorer.scoreInvoice(collected[1]);

    expect(r1.evidenceHash).not.toBe(r2.evidenceHash);
  });
});

import { InvoiceCollector } from '../../agent/src/collector/invoiceCollector';
import { generateDemoInvoices } from '../../agent/src/collector/invoiceGenerator';
import { LocalScorer } from '../../agent/src/validator/localScorer';
import { CrossRefChecker } from '../../agent/src/validator/crossRef';
import { BatchNftMinter } from '../../agent/src/publisher/batchNftMinter';
import { FallbackCache } from '../../agent/src/fallback/cache';
import { StalenessDetector } from '../../agent/src/fallback/staleness';

describe('Full Pipeline Integration', () => {
  test('should run collect → score → publish → cache cycle', async () => {
    // Step 1: Collect invoices
    const collector = new InvoiceCollector({ batchSize: 5 });
    const raw = generateDemoInvoices(5);
    const collected = collector.collectBatch(raw);
    expect(collected.length).toBe(5);

    // Step 2: Score invoices
    const scorer = new LocalScorer({ trustThreshold: 40 });
    const scores = scorer.scoreBatch(collected);
    const passing = scores.filter((s) => s.isAboveThreshold);
    expect(passing.length).toBeGreaterThan(0);

    // Step 3: Cross-reference check
    const crossRef = new CrossRefChecker();
    for (const score of passing) {
      const inv = collected.find((c) => c.invoiceId === score.invoiceId);
      if (inv) {
        const xref = await crossRef.check(inv.invoice);
        expect(xref.invoiceId).toBe(inv.invoiceId);
      }
    }

    // Step 4: Mint NFT
    const minter = new BatchNftMinter({ validityHours: 24 });
    const nft = minter.mintBatchNft(
      'BATCH-TEST-001',
      passing.map((s) => s.invoiceId),
    );
    expect(nft.active).toBe(true);
    expect(minter.isValid('BATCH-TEST-001')).toBe(true);

    // Step 5: Cache results
    const cache = new FallbackCache(30);
    const staleness = new StalenessDetector(30);
    for (const score of passing) {
      cache.set(score.invoiceId, score);
      staleness.markRefreshed(score.invoiceId);
    }
    expect(cache.size).toBe(passing.length);
    expect(staleness.staleKeys().length).toBe(0);
  });

  test('should detect stale data after threshold', () => {
    const detector = new StalenessDetector(0);
    detector.markRefreshed('key1');

    const report = detector.report('key1');
    expect(report.isStale).toBe(true);
  });

  test('should invalidate NFT', () => {
    const minter = new BatchNftMinter({ validityHours: 24 });
    minter.mintBatchNft('BATCH-INV', ['INV-1']);
    expect(minter.isValid('BATCH-INV')).toBe(true);

    minter.invalidate('BATCH-INV');
    expect(minter.isValid('BATCH-INV')).toBe(false);
  });
});

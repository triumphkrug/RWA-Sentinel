/**
 * RWA Sentinel — entry point.
 *
 * Starts the agent pipeline: collect → validate → publish.
 */

import { loadConfig } from './config.js';
import { InvoiceCollector } from './collector/invoiceCollector.js';
import { generateDemoInvoices } from './collector/invoiceGenerator.js';
import { LocalScorer } from './validator/localScorer.js';
import { CrossRefChecker } from './validator/crossRef.js';
import { CasperPublisher } from './publisher/casperPublisher.js';
import { BatchNftMinter } from './publisher/batchNftMinter.js';
import { FallbackCache } from './fallback/cache.js';
import { StalenessDetector } from './fallback/staleness.js';

async function main(): Promise<void> {
  // Step 1: Load and validate configuration
  const config = loadConfig();
  console.log(`[sentinel] Starting with chain=${config.chainName}, batch=${config.batchSize}`);

  // Step 2: Initialize pipeline components
  const collector = new InvoiceCollector({ batchSize: config.batchSize });
  const scorer = new LocalScorer({ trustThreshold: 60 });
  const crossRef = new CrossRefChecker();
  const publisher = new CasperPublisher({
    nodeUrl: config.nodeUrl,
    chainName: config.chainName,
    contractHash: '',
    deployerKeyPath: config.deployerKeyPath,
  });
  const nftMinter = new BatchNftMinter({ validityHours: config.nftValidityHours });
  const cache = new FallbackCache(config.staleThresholdMinutes);
  const staleness = new StalenessDetector(config.staleThresholdMinutes);

  // Step 3: Generate demo invoices for MVP demonstration
  const rawInvoices = generateDemoInvoices(config.batchSize);
  console.log(`[sentinel] Generated ${rawInvoices.length} demo invoices`);

  // Step 4: Collect and deduplicate
  const collected = collector.collectBatch(rawInvoices);
  console.log(`[sentinel] Collected ${collected.length} unique invoices`);

  // Step 5: Score each invoice
  const scores = scorer.scoreBatch(collected);
  const passing = scores.filter((s) => s.isAboveThreshold);
  console.log(`[sentinel] Scored: ${passing.length}/${scores.length} above threshold`);

  // Step 6: Cross-reference check on passing invoices
  for (const score of passing) {
    const inv = collected.find((c) => c.invoiceId === score.invoiceId);
    if (inv) {
      const xref = await crossRef.check(inv.invoice);
      console.log(
        `[sentinel] Cross-ref ${score.invoiceId}: ${xref.crossRefPassed ? 'PASS' : 'FAIL'}`,
      );
    }
  }

  // Step 7: Publish attestations to Casper
  if (passing.length > 0) {
    const publishResult = await publisher.publishBatch({
      assetIds: passing.map((s) => s.invoiceId),
      trustScores: passing.map((s) => s.trustScore),
      factorsHashes: passing.map((s) => s.factorsHash),
      evidenceHashes: passing.map((s) => s.evidenceHash),
    });
    console.log(`[sentinel] Published batch ${publishResult.batchId} (${publishResult.status})`);

    // Step 8: Mint batch NFT
    const nft = nftMinter.mintBatchNft(
      publishResult.batchId,
      passing.map((s) => s.invoiceId),
    );
    console.log(`[sentinel] Minted NFT for batch ${nft.batchId}, valid until ${nft.validUntil}`);

    // Step 9: Cache results
    for (const score of passing) {
      cache.set(score.invoiceId, score);
      staleness.markRefreshed(score.invoiceId);
    }
  }

  // Step 10: Report summary
  console.log(`[sentinel] Pipeline complete. Cache size: ${cache.size}`);
  const staleKeys = staleness.staleKeys();
  if (staleKeys.length > 0) {
    console.log(`[sentinel] WARNING: ${staleKeys.length} stale entries detected`);
  }
}

main().catch((err) => {
  console.error('[sentinel] Fatal error:', err);
  process.exit(1);
});

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
  const scorer = new LocalScorer({ trustThreshold: 65 });
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

  // Step 5: Cross-reference check all invoices (run before scoring so
  // results feed into the scoring context's hasCrossRef factor)
  const crossRefResults = new Map<string, boolean>();
  for (const inv of collected) {
    const xref = await crossRef.check(inv.invoice);
    crossRefResults.set(inv.invoiceId, xref.crossRefPassed);
    console.log(
      `[sentinel] Cross-ref ${inv.invoiceId}: ${xref.crossRefPassed ? 'PASS' : 'FAIL'} (matched: ${xref.matchedSources.join(',') || 'none'})`,
    );
  }

  // Step 6: Score each invoice with cross-reference results wired in
  const scores = scorer.scoreBatch(collected, crossRefResults);
  const passing = scores.filter((s) => s.isAboveThreshold);
  console.log(`[sentinel] Scored: ${passing.length}/${scores.length} above threshold`);

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

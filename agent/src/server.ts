/**
 * RWA Sentinel — HTTP API server.
 *
 * Exposes the agent pipeline via REST endpoints.
 */

import Fastify from 'fastify';
import { loadConfig } from './config.js';
import { InvoiceCollector } from './collector/invoiceCollector.js';
import { generateDemoInvoices } from './collector/invoiceGenerator.js';
import { LocalScorer } from './validator/localScorer.js';
import { CrossRefChecker } from './validator/crossRef.js';
import { FallbackCache } from './fallback/cache.js';
import { StalenessDetector } from './fallback/staleness.js';

const config = loadConfig();
const collector = new InvoiceCollector({ batchSize: config.batchSize });
const scorer = new LocalScorer({ trustThreshold: 60 });
const crossRef = new CrossRefChecker();
const cache = new FallbackCache(config.staleThresholdMinutes);
const staleness = new StalenessDetector(config.staleThresholdMinutes);

const app = Fastify({ logger: true });

app.get('/', async () => ({
  name: 'RWA-Sentinel',
  version: '0.1.0',
  status: 'running',
  description: 'AI-powered Real-World Asset Oracle for Casper Network',
  endpoints: ['/health', '/api/v1/pipeline', '/api/v1/scores', '/api/v1/cache/stats'],
}));

app.get('/health', async () => ({
  status: 'ok',
  uptime: process.uptime(),
  timestamp: new Date().toISOString(),
}));

app.post('/api/v1/pipeline', async () => {
  const rawInvoices = generateDemoInvoices(config.batchSize);
  const collected = collector.collectBatch(rawInvoices);
  const scores = scorer.scoreBatch(collected);
  const passing = scores.filter((s) => s.isAboveThreshold);

  const crossRefResults = [];
  for (const score of passing) {
    const inv = collected.find((c) => c.invoiceId === score.invoiceId);
    if (inv) {
      const xref = await crossRef.check(inv.invoice);
      crossRefResults.push({ invoiceId: score.invoiceId, passed: xref.crossRefPassed });
      cache.set(score.invoiceId, score);
      staleness.markRefreshed(score.invoiceId);
    }
  }

  return {
    generated: rawInvoices.length,
    collected: collected.length,
    scored: scores.length,
    passing: passing.length,
    crossRefResults,
    cacheSize: cache.size,
  };
});

app.get('/api/v1/scores', async () => {
  const rawInvoices = generateDemoInvoices(config.batchSize);
  const collected = collector.collectBatch(rawInvoices);
  const scores = scorer.scoreBatch(collected);
  return { scores };
});

app.get('/api/v1/cache/stats', async () => ({
  size: cache.size,
  staleKeys: staleness.staleKeys(),
}));

const port = parseInt(process.env.PORT || '3000', 10);
app.listen({ port, host: '0.0.0.0' }).then((address) => {
  console.log(`[sentinel] API server listening at ${address}`);
}).catch((err) => {
  console.error('[sentinel] Failed to start:', err);
  process.exit(1);
});

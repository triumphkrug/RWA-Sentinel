/**
 * RWA Sentinel — HTTP API server.
 *
 * Exposes the agent pipeline via REST endpoints.
 * Persists scores to PostgreSQL when DATABASE_URL is set.
 */

import Fastify from 'fastify';
import { randomUUID } from 'node:crypto';
import { loadConfig } from './config.js';
import { InvoiceCollector } from './collector/invoiceCollector.js';
import { generateDemoInvoices } from './collector/invoiceGenerator.js';
import { LocalScorer } from './validator/localScorer.js';
import { CrossRefChecker } from './validator/crossRef.js';
import { FallbackCache } from './fallback/cache.js';
import { StalenessDetector } from './fallback/staleness.js';
import { CasperPublisher } from './publisher/casperPublisher.js';
import { BatchNftMinter } from './publisher/batchNftMinter.js';
import { PgStore } from './store/pg.js';

const config = loadConfig();
const collector = new InvoiceCollector({ batchSize: config.batchSize });
const scorer = new LocalScorer({ trustThreshold: 60 });
const crossRef = new CrossRefChecker();
const cache = new FallbackCache(config.staleThresholdMinutes);
const staleness = new StalenessDetector(config.staleThresholdMinutes);
const nftMinter = new BatchNftMinter({ validityHours: 24 });

const publisher = new CasperPublisher({
  nodeUrl: process.env.CASPER_NODE_URL || 'https://rpc.testnet.casperlabs.io',
  chainName: process.env.CASPER_CHAIN || 'casper-test',
  contractHash: '53c9e87755a94e1b1efe38e23c83a50f6ffe77e200937dd0c1f923fe2976dce8',
  deployerKeyPath: process.env.DEPLOYER_KEY_PATH || '/etc/secrets/deployer.pem',
});

const dbUrl = process.env.DATABASE_URL;
let store: PgStore | null = null;

const app = Fastify({ logger: true });

app.addHook('onRequest', async (request, reply) => {
  reply.header('Access-Control-Allow-Origin', '*');
  reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Public-Key');
  if (request.method === 'OPTIONS') {
    reply.status(204).send();
  }
});

app.get('/', async () => ({
  name: 'RWA-Sentinel',
  version: '0.2.0',
  status: 'running',
  description: 'AI-powered Real-World Asset Oracle for Casper Network',
  endpoints: [
    '/health',
    '/api/v1/pipeline',
    '/api/v1/scores',
    '/api/v1/stats',
    '/api/v1/attestations',
    '/api/v1/attestations/:id',
    '/api/v1/cache/stats',
  ],
}));

app.get('/health', async () => ({
  status: 'ok',
  uptime: process.uptime(),
  timestamp: new Date().toISOString(),
  chain: 'casper-test',
  contracts: {
    scoring_registry: 'eac01f54e99db58d328e672d2ce5c40a6677cab577cc2bc3b9f8bbe277bd48c3',
    attestation_store: '53c9e87755a94e1b1efe38e23c83a50f6ffe77e200937dd0c1f923fe2976dce8',
  },
  totalScored: cache.size,
  db: store ? 'connected' : 'memory-only',
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

  // Publish passing attestations on-chain
  let publishHash = '';
  if (passing.length > 0) {
    try {
      const pubResult = await publisher.publishBatch({
        assetIds: passing.map((s) => s.invoiceId),
        trustScores: passing.map((s) => s.trustScore),
        factorsHashes: passing.map((s) => s.factorsHash),
        evidenceHashes: passing.map((s) => s.evidenceHash),
      });
      publishHash = pubResult.transactionHash;
      nftMinter.mintBatchNft(
        pubResult.batchId,
        passing.map((s) => s.invoiceId),
      );
    } catch (err) {
      console.warn('[pipeline] publish failed:', err);
    }
  }

  // Persist to DB
  if (store) {
    const invoiceMap = new Map(
      collected.map((c) => [
        c.invoiceId,
        {
          issuerId: c.invoice.issuer,
          debtorId: c.invoice.debtor,
          amount: c.invoice.amountCents / 100,
          currency: c.invoice.currencyCode,
        },
      ]),
    );
    await store.saveBatch(scores, invoiceMap);
    const runId = randomUUID().slice(0, 8);
    await store.savePipelineRun(runId, {
      generated: rawInvoices.length,
      collected: collected.length,
      scored: scores.length,
      passing: passing.length,
      cacheSize: cache.size,
    });
  }

  return {
    generated: rawInvoices.length,
    collected: collected.length,
    scored: scores.length,
    passing: passing.length,
    crossRefResults,
    cacheSize: cache.size,
    publishHash: publishHash || undefined,
  };
});

app.get('/api/v1/scores', async () => {
  if (store) {
    const all = await store.loadAll();
    return { scores: all };
  }
  const rawInvoices = generateDemoInvoices(config.batchSize);
  const collected = collector.collectBatch(rawInvoices);
  const scores = scorer.scoreBatch(collected);
  return { scores };
});

app.get('/api/v1/stats', async () => {
  if (store) {
    return store.getStats();
  }
  return {
    totalScored: cache.size,
    activeAttestations: 0,
    expiredAttestations: 0,
    avgTrustScore: 0,
    assetTypes: {},
  };
});

app.get<{ Querystring: { page?: string; limit?: string; status?: string; min_score?: string } }>(
  '/api/v1/attestations',
  async (request) => {
    const { page, limit, status, min_score } = request.query;
    if (store) {
      return store.listAttestations({
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
        status: status ?? undefined,
        minScore: min_score ? parseInt(min_score, 10) : undefined,
      });
    }
    return { attestations: [], total: 0, page: 1, limit: 20 };
  },
);

app.get<{ Params: { id: string } }>('/api/v1/attestations/:id', async (request, reply) => {
  if (store) {
    const att = await store.getAttestation(request.params.id);
    if (!att) {
      reply.status(404);
      return { error: 'attestation not found' };
    }
    return att;
  }
  reply.status(404);
  return { error: 'no database configured' };
});

app.get('/api/v1/cache/stats', async () => ({
  size: cache.size,
  staleKeys: staleness.staleKeys(),
}));

async function bootstrap(): Promise<void> {
  if (dbUrl) {
    console.log('[sentinel] Connecting to PostgreSQL...');
    store = new PgStore(dbUrl);
    await store.init();
    console.log('[sentinel] PostgreSQL connected, tables ensured.');
  }

  const port = parseInt(process.env.PORT || '3000', 10);
  const address = await app.listen({ port, host: '0.0.0.0' });
  console.log(`[sentinel] API server listening at ${address}`);
}

bootstrap().catch((err) => {
  console.error('[sentinel] Failed to start:', err);
  process.exit(1);
});

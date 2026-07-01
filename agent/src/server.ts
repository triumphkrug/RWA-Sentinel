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

const ALLOWED_ORIGINS = process.env.CORS_ORIGINS?.split(',') ?? ['*'];

app.addHook('onRequest', async (request, reply) => {
  const origin = request.headers.origin ?? '*';
  const allowedOrigin = ALLOWED_ORIGINS.includes('*')
    ? '*'
    : ALLOWED_ORIGINS.includes(origin)
      ? origin
      : ALLOWED_ORIGINS[0];
  reply.header('Access-Control-Allow-Origin', allowedOrigin);
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
    '/api/v1/chain/all',
    '/api/v1/chain/overview',
    '/api/v1/chain/activity',
    '/api/v1/chain/transactions',
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
    // Validate and sanitize query params
    const parsedPage = page ? Math.max(1, parseInt(page, 10) || 1) : undefined;
    const parsedLimit = limit ? Math.min(100, Math.max(1, parseInt(limit, 10) || 20)) : undefined;
    if (store) {
      return store.listAttestations({
        page: parsedPage,
        limit: parsedLimit,
        status: status && /^[a-z_]+$/.test(status) ? status : undefined,
        minScore: min_score ? Math.max(0, Math.min(100, parseInt(min_score, 10) || 0)) : undefined,
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

/* ── Allium on-chain analytics ─────────────────────────────── */

const ALLIUM_KEY = process.env.ALLIUM_API_KEY || '';
const ALLIUM_BASE = 'https://api.allium.so/api/v1/explorer';
const ALLIUM_QUERIES: Record<string, string> = {
  network:  'Tvk9wuy3J7ut9EgXjd3a',  // Network Overview
  activity: '3TX7r6MVRCIUB9NpVzMx',  // Daily TX Activity
  large_tx: 'VIEIH4vq8dwoVve1TTrb',  // Large Transactions
};

// Long-lived cache (30 min) — Allium Explorer has strict rate limits
const alliumCache = new Map<string, { data: unknown; ts: number }>();
const ALLIUM_TTL_MS = 30 * 60 * 1000; // 30 minutes

// Mutex: prevent duplicate in-flight requests for the same query
const alliumInFlight = new Map<string, Promise<unknown>>();

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchWithRetry(url: string, opts: RequestInit, retries = 3): Promise<Response> {
  for (let attempt = 0; attempt < retries; attempt++) {
    const resp = await fetch(url, opts);
    if (resp.status === 429) {
      const wait = Math.min(5000 * (attempt + 1), 15000);
      console.warn(`[allium] 429 rate-limited, waiting ${wait}ms (attempt ${attempt + 1}/${retries})`);
      await delay(wait);
      continue;
    }
    return resp;
  }
  // Last attempt, return whatever we get
  return fetch(url, opts);
}

async function _runAlliumQuery(queryId: string): Promise<unknown> {
  if (!ALLIUM_KEY) return { error: 'ALLIUM_API_KEY not configured' };

  try {
    const runResp = await fetchWithRetry(`${ALLIUM_BASE}/queries/${queryId}/run-async`, {
      method: 'POST',
      headers: { 'X-API-KEY': ALLIUM_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ parameters: {} }),
    });
    if (runResp.status === 429) return { error: 'Rate limited — try again later' };
    const body = await runResp.json() as Record<string, unknown>;
    const run_id = body.run_id as string;
    if (!run_id) return { error: 'Failed to create query run', detail: body };

    // Poll for results (max 60s, with increasing delays)
    for (let i = 0; i < 12; i++) {
      await delay(3000 + i * 1000); // 3s, 4s, 5s, ...
      const statusResp = await fetchWithRetry(`${ALLIUM_BASE}/query-runs/${run_id}/status`, {
        headers: { 'X-API-KEY': ALLIUM_KEY },
      });
      if (statusResp.status === 429) { await delay(5000); continue; }
      const status = await statusResp.json();
      if (status === 'success') {
        await delay(2000); // Extra pause before results fetch
        const resultResp = await fetchWithRetry(`${ALLIUM_BASE}/query-runs/${run_id}/results?f=json`, {
          headers: { 'X-API-KEY': ALLIUM_KEY },
        });
        if (resultResp.status === 429) return { error: 'Rate limited on results — cached data will refresh later' };
        const data = await resultResp.json();
        if (data && typeof data === 'object' && 'detail' in data && (data as Record<string,unknown>).detail === 'Too Many Requests') {
          return { error: 'Rate limited on results' };
        }
        alliumCache.set(queryId, { data, ts: Date.now() });
        return data;
      }
      if (status === 'failed') return { error: 'Query execution failed' };
    }
    return { error: 'Query timeout (60s)' };
  } catch (err) {
    console.error('[allium] query error:', err);
    return { error: 'Allium API request failed' };
  }
}

async function runAlliumQuery(queryId: string): Promise<unknown> {
  // Return cache if fresh
  const cached = alliumCache.get(queryId);
  if (cached && Date.now() - cached.ts < ALLIUM_TTL_MS) return cached.data;

  // De-duplicate: if a fetch is already in-flight, wait for it
  const existing = alliumInFlight.get(queryId);
  if (existing) return existing;

  const promise = _runAlliumQuery(queryId).finally(() => {
    alliumInFlight.delete(queryId);
  });
  alliumInFlight.set(queryId, promise);

  const result = await promise;
  // If query failed but we have stale cached data, return stale data
  if (result && typeof result === 'object' && 'error' in result) {
    if (cached) {
      console.warn(`[allium] returning stale cache for ${queryId} due to error`);
      return cached.data;
    }
  }
  return result;
}

// Single endpoint that returns all 3 datasets at once (saves rate-limit budget)
app.get('/api/v1/chain/all', async () => {
  // Run queries SEQUENTIALLY with delays to avoid rate limits
  const overview = await runAlliumQuery(ALLIUM_QUERIES.network);
  await delay(2000);
  const activity = await runAlliumQuery(ALLIUM_QUERIES.activity);
  await delay(2000);
  const transactions = await runAlliumQuery(ALLIUM_QUERIES.large_tx);
  return {
    source: 'allium',
    overview,
    activity,
    transactions,
  };
});

app.get('/api/v1/chain/overview', async () => {
  const data = await runAlliumQuery(ALLIUM_QUERIES.network);
  return { source: 'allium', query: 'network_overview', data };
});

app.get('/api/v1/chain/activity', async () => {
  const data = await runAlliumQuery(ALLIUM_QUERIES.activity);
  return { source: 'allium', query: 'daily_activity', data };
});

app.get('/api/v1/chain/transactions', async () => {
  const data = await runAlliumQuery(ALLIUM_QUERIES.large_tx);
  return { source: 'allium', query: 'large_transactions', data };
});

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

/**
 * PostgreSQL persistence layer for scores and attestations.
 */

import pg from 'pg';
import type { ScoringResult } from '../validator/types.js';

const { Pool } = pg;

export class PgStore {
  private pool: pg.Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: true }  // Require valid SSL certs in production
        : { rejectUnauthorized: false }, // Allow self-signed in dev/test
    });
  }

  /** Ensure tables exist on startup. */
  async init(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS scores (
        id SERIAL PRIMARY KEY,
        invoice_id TEXT UNIQUE NOT NULL,
        trust_score INTEGER NOT NULL,
        is_above_threshold BOOLEAN NOT NULL,
        scored_at TIMESTAMPTZ DEFAULT NOW(),
        issuer_id TEXT,
        debtor_id TEXT,
        amount NUMERIC,
        currency TEXT DEFAULT 'USD',
        asset_type TEXT DEFAULT 'invoice',
        factors_hash TEXT,
        evidence_hash TEXT,
        factors JSONB,
        attestation_status TEXT DEFAULT 'active',
        attestation_expires_at TIMESTAMPTZ,
        deploy_hash TEXT,
        public_key TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await this.pool.query(`CREATE INDEX IF NOT EXISTS idx_scores_invoice ON scores(invoice_id)`);
    await this.pool.query(
      `CREATE INDEX IF NOT EXISTS idx_scores_status ON scores(attestation_status)`,
    );
    await this.pool.query(`CREATE INDEX IF NOT EXISTS idx_scores_trust ON scores(trust_score)`);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS pipeline_runs (
        id SERIAL PRIMARY KEY,
        run_id TEXT UNIQUE NOT NULL,
        generated INTEGER,
        collected INTEGER,
        scored INTEGER,
        passing INTEGER,
        cache_size INTEGER,
        public_key TEXT,
        run_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
  }

  /** Save a scored result to the database. */
  async saveScore(
    result: ScoringResult,
    meta?: {
      issuerId?: string;
      debtorId?: string;
      amount?: number;
      currency?: string;
      assetType?: string;
      publicKey?: string;
    },
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
    await this.pool.query(
      `
      INSERT INTO scores (invoice_id, trust_score, is_above_threshold, scored_at,
        issuer_id, debtor_id, amount, currency, asset_type,
        factors_hash, evidence_hash, factors,
        attestation_status, attestation_expires_at, public_key)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      ON CONFLICT (invoice_id) DO UPDATE SET
        trust_score = EXCLUDED.trust_score,
        is_above_threshold = EXCLUDED.is_above_threshold,
        scored_at = EXCLUDED.scored_at,
        factors_hash = EXCLUDED.factors_hash,
        evidence_hash = EXCLUDED.evidence_hash,
        factors = EXCLUDED.factors,
        attestation_status = EXCLUDED.attestation_status,
        attestation_expires_at = EXCLUDED.attestation_expires_at
    `,
      [
        result.invoiceId,
        result.trustScore,
        result.isAboveThreshold,
        result.scoredAt,
        meta?.issuerId ?? null,
        meta?.debtorId ?? null,
        meta?.amount ?? null,
        meta?.currency ?? 'USD',
        meta?.assetType ?? 'invoice',
        result.factorsHash,
        result.evidenceHash,
        JSON.stringify(result.factors),
        result.isAboveThreshold ? 'active' : 'below_threshold',
        result.isAboveThreshold ? expiresAt : null,
        meta?.publicKey ?? null,
      ],
    );
  }

  /** Batch save scored results. */
  async saveBatch(
    results: ScoringResult[],
    invoiceMap?: Map<
      string,
      {
        issuerId: string;
        debtorId: string;
        amount: number;
        currency: string;
      }
    >,
  ): Promise<void> {
    for (const r of results) {
      const meta = invoiceMap?.get(r.invoiceId);
      await this.saveScore(r, {
        issuerId: meta?.issuerId,
        debtorId: meta?.debtorId,
        amount: meta?.amount,
        currency: meta?.currency,
      });
    }
  }

  /** Save a pipeline run record. */
  async savePipelineRun(
    runId: string,
    data: {
      generated: number;
      collected: number;
      scored: number;
      passing: number;
      cacheSize: number;
      publicKey?: string;
    },
  ): Promise<void> {
    await this.pool.query(
      `
      INSERT INTO pipeline_runs (run_id, generated, collected, scored, passing, cache_size, public_key)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      ON CONFLICT (run_id) DO NOTHING
    `,
      [
        runId,
        data.generated,
        data.collected,
        data.scored,
        data.passing,
        data.cacheSize,
        data.publicKey ?? null,
      ],
    );
  }

  /** Get aggregate stats. */
  async getStats(): Promise<{
    totalScored: number;
    activeAttestations: number;
    expiredAttestations: number;
    avgTrustScore: number;
    assetTypes: Record<string, number>;
  }> {
    const total = await this.pool.query(`SELECT count(*) as c FROM scores`);
    const active = await this.pool.query(
      `SELECT count(*) as c FROM scores WHERE attestation_status = 'active' AND (attestation_expires_at IS NULL OR attestation_expires_at > NOW())`,
    );
    const expired = await this.pool.query(
      `SELECT count(*) as c FROM scores WHERE attestation_expires_at IS NOT NULL AND attestation_expires_at <= NOW()`,
    );
    const avg = await this.pool.query(
      `SELECT COALESCE(ROUND(AVG(trust_score)), 0) as a FROM scores`,
    );
    const types = await this.pool.query(
      `SELECT asset_type, count(*) as c FROM scores GROUP BY asset_type`,
    );

    const assetTypes: Record<string, number> = {};
    for (const row of types.rows) {
      assetTypes[row.asset_type || 'invoice'] = parseInt(row.c, 10);
    }

    return {
      totalScored: parseInt(total.rows[0].c, 10),
      activeAttestations: parseInt(active.rows[0].c, 10),
      expiredAttestations: parseInt(expired.rows[0].c, 10),
      avgTrustScore: parseInt(avg.rows[0].a, 10),
      assetTypes,
    };
  }

  /** List attestations with pagination and filters. */
  async listAttestations(opts: {
    page?: number;
    limit?: number;
    status?: string;
    minScore?: number;
  }): Promise<{ attestations: ScoringResult[]; total: number; page: number; limit: number }> {
    const page = opts.page ?? 1;
    const limit = Math.min(opts.limit ?? 20, 100);
    const offset = (page - 1) * limit;

    let where = 'WHERE 1=1';
    const params: unknown[] = [];
    let idx = 1;

    if (opts.status) {
      where += ` AND attestation_status = $${idx}`;
      params.push(opts.status);
      idx++;
    }
    if (opts.minScore) {
      where += ` AND trust_score >= $${idx}`;
      params.push(opts.minScore);
      idx++;
    }

    const countRes = await this.pool.query(`SELECT count(*) as c FROM scores ${where}`, params);
    const total = parseInt(countRes.rows[0].c, 10);

    const rows = await this.pool.query(
      `SELECT * FROM scores ${where} ORDER BY scored_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset],
    );

    return {
      attestations: rows.rows.map(this.rowToResult),
      total,
      page,
      limit,
    };
  }

  /** Get a single attestation by invoice_id. */
  async getAttestation(invoiceId: string): Promise<ScoringResult | null> {
    const res = await this.pool.query(`SELECT * FROM scores WHERE invoice_id = $1`, [invoiceId]);
    if (res.rows.length === 0) return null;
    return this.rowToResult(res.rows[0]);
  }

  /** Load all scores (for in-memory cache population). */
  async loadAll(): Promise<ScoringResult[]> {
    const res = await this.pool.query(`SELECT * FROM scores ORDER BY scored_at DESC`);
    return res.rows.map(this.rowToResult);
  }

  private rowToResult(row: Record<string, unknown>): ScoringResult {
    return {
      invoiceId: row.invoice_id as string,
      trustScore: row.trust_score as number,
      factors:
        (row.factors as Array<{ name: string; weight: number; score: number; evidence: string }>) ??
        [],
      factorsHash: (row.factors_hash as string) ?? '',
      evidenceHash: (row.evidence_hash as string) ?? '',
      scoredAt: row.scored_at as Date,
      isAboveThreshold: row.is_above_threshold as boolean,
    };
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

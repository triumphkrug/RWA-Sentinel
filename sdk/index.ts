/**
 * RWA-Sentinel TypeScript SDK.
 *
 * Provides typed access to the Sentinel agent API for registering,
 * attesting, and querying real-world assets on-chain.
 *
 * @example
 * ```ts
 * import { SentinelClient } from './sdk';
 *
 * const client = new SentinelClient('http://localhost:3000');
 * const asset = await client.registerAsset({
 *   assetType: 'invoice',
 *   metadata: '{"vendor":"Acme","total":15000}',
 *   owner: 'account-hash-abc...',
 * });
 * ```
 */

export interface AssetInput {
  assetType: string;
  metadata: string;
  owner: string;
}

export interface Asset {
  id: number;
  assetType: string;
  metadata: string;
  owner: string;
  status: 'registered' | 'attested' | 'challenged' | 'invalidated';
  createdAt: string;
}

export interface AttestationInput {
  assetId: number;
  score: number;
  evidence: string;
  oracleId: string;
}

export interface Attestation {
  batchId: number;
  assetId: number;
  score: number;
  status: string;
  oracleId: string;
  stakeAmount: number;
  createdAt: string;
}

export interface ChallengeInput {
  batchId: number;
  reason: string;
  evidence: string;
  challenger: string;
}

export interface HealthResponse {
  status: string;
  version: string;
}

export class SentinelClient {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(baseUrl: string = 'http://localhost:3000', apiKey?: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.headers = { 'Content-Type': 'application/json' };
    if (apiKey) {
      this.headers['Authorization'] = `Bearer ${apiKey}`;
    }
  }

  // -- Health -----------------------------------------------------------

  async health(): Promise<HealthResponse> {
    return this.get('/health');
  }

  // -- Assets -----------------------------------------------------------

  async registerAsset(input: AssetInput): Promise<Asset> {
    return this.post('/assets', input);
  }

  async getAsset(id: number): Promise<Asset> {
    return this.get(`/assets/${id}`);
  }

  async listAssets(owner?: string): Promise<Asset[]> {
    const qs = owner ? `?owner=${encodeURIComponent(owner)}` : '';
    return this.get(`/assets${qs}`);
  }

  // -- Attestations -----------------------------------------------------

  async submitAttestation(input: AttestationInput): Promise<Attestation> {
    return this.post('/attestations', input);
  }

  async getAttestation(batchId: number): Promise<Attestation> {
    return this.get(`/attestations/${batchId}`);
  }

  async listAttestations(assetId?: number): Promise<Attestation[]> {
    const qs = assetId !== undefined ? `?assetId=${assetId}` : '';
    return this.get(`/attestations${qs}`);
  }

  // -- Challenges -------------------------------------------------------

  async submitChallenge(input: ChallengeInput): Promise<{ success: boolean; message: string }> {
    return this.post('/challenges', input);
  }

  // -- Oracle management ------------------------------------------------

  async stakeOracle(oracleId: string, amount: number): Promise<{ staked: number }> {
    return this.post('/oracles/stake', { oracleId, amount });
  }

  async getOracleStake(oracleId: string): Promise<{ oracleId: string; stake: number }> {
    return this.get(`/oracles/${encodeURIComponent(oracleId)}/stake`);
  }

  // -- Internal ---------------------------------------------------------

  private async get<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, { headers: this.headers });
    if (!res.ok) {
      const body = await res.text();
      throw new SentinelError(res.status, body);
    }
    return res.json() as Promise<T>;
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new SentinelError(res.status, text);
    }
    return res.json() as Promise<T>;
  }
}

export class SentinelError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
  ) {
    super(`Sentinel API error ${status}: ${body}`);
    this.name = 'SentinelError';
  }
}

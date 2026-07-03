import {
  Attestation,
  AttestationInput,
  AttestationResult,
  OracleScore,
  OracleQuery,
  OracleResponse,
  PaginatedResult,
  Proposal,
  ProposalInput,
  VoteType,
  VoteResult,
  SlashingInput,
  SlashingReport,
  ChallengeResult,
  ConsensusState,
  SentinelEvent,
  ProtocolStats,
  OracleNode,
} from './types';

interface RequestOptions {
  timeout?: number;
  signal?: AbortSignal;
}

class SentinelError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;

  constructor(message: string, statusCode: number, errorCode: string = 'UNKNOWN') {
    super(message);
    this.name = 'SentinelError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
  }
}

export class RWASentinelClient {
  private readonly baseUrl: string;
  private readonly defaultTimeout: number;
  private authToken: string | null = null;

  constructor(baseUrl: string, options?: { timeout?: number; authToken?: string }) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.defaultTimeout = options?.timeout ?? 30000;
    this.authToken = options?.authToken ?? null;
  }

  setAuthToken(token: string): void {
    this.authToken = token;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timeout = options?.timeout ?? this.defaultTimeout;
    const timer = setTimeout(() => controller.abort(), timeout);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: options?.signal ?? controller.signal,
      });

      if (!response.ok) {
        let errorBody: { error?: string; code?: string } = {};
        try {
          errorBody = await response.json();
        } catch {
          // non-JSON error
        }
        throw new SentinelError(
          errorBody.error ?? `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          errorBody.code ?? 'HTTP_ERROR'
        );
      }

      const data = await response.json();
      return data as T;
    } catch (err) {
      if (err instanceof SentinelError) throw err;
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new SentinelError(`Request timeout after ${timeout}ms`, 408, 'TIMEOUT');
      }
      throw new SentinelError(
        `Network error: ${err instanceof Error ? err.message : String(err)}`,
        0,
        'NETWORK_ERROR'
      );
    } finally {
      clearTimeout(timer);
    }
  }

  // === Attestation Methods ===

  async submitAttestation(data: AttestationInput): Promise<AttestationResult> {
    if (!data.assetId || !data.assetType) {
      throw new SentinelError('assetId and assetType are required', 400, 'VALIDATION');
    }
    return this.request<AttestationResult>('POST', '/api/v1/pipeline', data);
  }

  async getAttestation(attestationId: string): Promise<Attestation> {
    return this.request<Attestation>('GET', `/api/v1/attestations/${encodeURIComponent(attestationId)}`);
  }

  async getAttestations(params?: {
    page?: number;
    limit?: number;
    status?: string;
    minScore?: number;
  }): Promise<PaginatedResult<Attestation>> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.status) query.set('status', params.status);
    if (params?.minScore) query.set('min_score', String(params.minScore));
    const qs = query.toString();
    return this.request<PaginatedResult<Attestation>>(
      'GET',
      `/api/v1/attestations${qs ? `?${qs}` : ''}`
    );
  }

  // === Oracle Scoring ===

  async getScore(assetId: string): Promise<OracleScore> {
    return this.request<OracleScore>('GET', `/api/v1/scores/${encodeURIComponent(assetId)}`);
  }

  async queryOracle(query: OracleQuery): Promise<OracleResponse> {
    const params = new URLSearchParams();
    if (query.assetId) params.set('asset_id', query.assetId);
    if (query.assetType) params.set('asset_type', query.assetType);
    if (query.minScore !== undefined) params.set('min_score', String(query.minScore));
    if (query.dateRange) {
      if (query.dateRange.from) params.set('from', query.dateRange.from);
      if (query.dateRange.to) params.set('to', query.dateRange.to);
    }
    const qs = params.toString();
    return this.request<OracleResponse>('GET', `/api/v1/attestations${qs ? `?${qs}` : ''}`);
  }

  // === Governance ===

  async createProposal(proposal: ProposalInput): Promise<Proposal> {
    if (!proposal.title || !proposal.description || !proposal.type) {
      throw new SentinelError('title, description, and type are required', 400, 'VALIDATION');
    }
    return this.request<Proposal>('POST', '/api/v1/governance/proposals', proposal);
  }

  async getProposals(params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResult<Proposal>> {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    const qs = query.toString();
    return this.request<PaginatedResult<Proposal>>(
      'GET',
      `/api/v1/governance/proposals${qs ? `?${qs}` : ''}`
    );
  }

  async vote(proposalId: string, vote: VoteType): Promise<VoteResult> {
    return this.request<VoteResult>(
      'POST',
      `/api/v1/governance/proposals/${encodeURIComponent(proposalId)}/vote`,
      { vote }
    );
  }

  // === Slashing ===

  async reportSlashing(report: SlashingInput): Promise<SlashingReport> {
    if (!report.oracleId || !report.reason) {
      throw new SentinelError('oracleId and reason are required', 400, 'VALIDATION');
    }
    return this.request<SlashingReport>('POST', '/api/v1/slashing/reports', report);
  }

  async challengeSlashing(reportId: string, evidence: string): Promise<ChallengeResult> {
    return this.request<ChallengeResult>(
      'POST',
      `/api/v1/slashing/reports/${encodeURIComponent(reportId)}/challenge`,
      { evidence }
    );
  }

  async getSlashingReports(params?: {
    status?: string;
    page?: number;
  }): Promise<PaginatedResult<SlashingReport>> {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.page) query.set('page', String(params.page));
    const qs = query.toString();
    return this.request<PaginatedResult<SlashingReport>>(
      'GET',
      `/api/v1/slashing/reports${qs ? `?${qs}` : ''}`
    );
  }

  // === Consensus ===

  async getConsensusState(): Promise<ConsensusState> {
    return this.request<ConsensusState>('GET', '/api/v1/consensus/state');
  }

  async getOracles(): Promise<OracleNode[]> {
    return this.request<OracleNode[]>('GET', '/api/v1/oracles');
  }

  // === Data Feeds ===

  async getLeiData(lei: string): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>('GET', `/api/v1/data/lei/${encodeURIComponent(lei)}`);
  }

  async getPriceData(symbol: string): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>('GET', `/api/v1/data/price/${encodeURIComponent(symbol)}`);
  }

  // === Statistics ===

  async getStats(): Promise<ProtocolStats> {
    return this.request<ProtocolStats>('GET', '/api/v1/stats');
  }

  // === Real-time Events ===

  subscribeEvents(callback: (event: SentinelEvent) => void): WebSocket {
    const wsUrl = this.baseUrl.replace(/^http/, 'ws') + '/ws/events';
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (evt) => {
      try {
        const event: SentinelEvent = JSON.parse(evt.data);
        callback(event);
      } catch {
        console.error('[RWASentinel] Failed to parse event:', evt.data);
      }
    };

    ws.onerror = (err) => {
      console.error('[RWASentinel] WebSocket error:', err);
    };

    ws.onclose = () => {
      console.info('[RWASentinel] WebSocket closed');
    };

    return ws;
  }
}

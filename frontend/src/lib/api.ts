
const BASE_URL = '';

// --- General Types ---
export interface HealthResponse {
  status: string;
  uptime: number;
  timestamp: string;
  chain: string;
  contracts: Record<string, string>;
  totalScored: number;
  db: string;
}

export interface ErrorResponse {
  message: string;
  statusCode?: number;
  error?: string;
}

// --- Main API Types ---

export interface RealInvoiceLineItem {
  description: string;
  quantity: number;
  unitPriceCents: number;
}

export interface RealInvoice {
  invoiceId: string;
  issuer: string;
  debtor: string;
  amountCents: number;
  currencyCode: string;
  issuedAt: string;
  dueAt: string;
  lineItems: RealInvoiceLineItem[];
  metadata?: Record<string, string>;
}

export interface PipelineRunRequest {
  lei?: string;
  company_id?: string;
  jurisdiction?: string;
  symbol?: string;
  asset_type?: string;
  metadata?: Record<string, any>;
  invoices?: RealInvoice[];
}

export interface PipelineRunResponse {
  pipeline_id: string;
  status: string;
  timestamp: string;
  dataSource?: 'real-upload' | 'demo';
  scored?: number;
  attested?: number;
}

export interface ScoreFactor {
  name: string;
  score: number;
  weight: number;
  details?: string;
  evidence?: string;
}

export interface AssetScore {
  asset_id: string;
  asset_type: string;
  identifier: string;
  score: number;
  factors: ScoreFactor[];
  timestamp: string;
  isAboveThreshold?: boolean;
  metadata?: Record<string, any>;
}

export interface StatsResponse {
  totalScored: number;
  activeAttestations: number;
  expiredAttestations: number;
  avgTrustScore: number;
  assetTypes: Record<string, number>;
}

export type AttestationStatus = 'pending' | 'attested' | 'challenged' | 'slashed' | 'expired';

export interface Attestation {
  id: string;
  asset_id: string;
  asset_type: string;
  identifier: string;
  score: number;
  status: AttestationStatus;
  attestation_hash: string;
  casper_block_hash: string;
  timestamp: string;
  expires_at: string;
  metadata?: Record<string, any>;
  holder_did?: string;
}

export interface AttestationsResponse {
  attestations: Attestation[];
  total: number;
  page: number;
  limit: number;
}

export interface CacheStatsResponse {
  total_entries: number;
  hits: number;
  misses: number;
  last_cleared: string;
}

// --- Data API Types ---
export interface LEIData {
  lei: string;
  legal_name: string;
  legal_address: string;
  jurisdiction: string;
  entity_status: string;
  registration_date: string;
  last_update_date: string;
  metadata?: Record<string, any>;
}

export interface PriceData {
  symbol: string;
  price: number;
  currency: string;
  timestamp: string;
  source: string;
}

export interface CompanyData {
  id: string;
  name: string;
  jurisdiction: string;
  registration_date: string;
  status: string;
  address: string;
  metadata?: Record<string, any>;
}

// --- Governance API Types ---
export type ProposalStatus = 'pending' | 'voting' | 'approved' | 'rejected' | 'executed' | 'expired';
export type ProposalType = 'parameter_change' | 'contract_upgrade' | 'treasury_spend';

export interface Proposal {
  id: string;
  proposerPublicKey: string;
  type: ProposalType;
  description: string;
  status: ProposalStatus;
  createdAt: string;
  votingEndsAt: string;
  votesFor: number;
  votesAgainst: number;
  quorumRequired: number;
  totalStakeAtCreation: number;
  executionData: Record<string, any>;
  onChainProposalId?: number;
  onChainCreateTxHash?: string;
}

export interface ProposeRequest {
  type: ProposalType;
  description: string;
  proposerPublicKey: string;
  executionData?: Record<string, any>;
}

export interface VoteRequest {
  proposalId: string;
  voterPublicKey: string;
  support: 'for' | 'against';
}

export interface ExecuteRequest {
  proposalId: string;
  executorPublicKey: string;
}

// --- Slashing API Types ---
export type ReportStatus = 'pending' | 'challenged' | 'validated' | 'executed' | 'dismissed';

export interface SlashingReport {
  id: string;
  reporter: string;
  oracle_id: string;
  reason: string;
  status: ReportStatus;
  timestamp: string;
  challenge_deadline?: string;
  validation_deadline?: string;
  metadata?: Record<string, any>;
}

export interface ReportRequest {
  oracle_id: string;
  reason: string;
  evidence?: string;
}

export interface ChallengeRequest {
  report_id: string;
  challenger: string;
  reason: string;
  evidence?: string;
}

export interface ValidateRequest {
  report_id: string;
  validator: string;
  valid: boolean;
  evidence?: string;
}

export interface SlashingExecuteRequest {
  report_id: string;
  executor: string;
}

// --- Consensus API Types ---
export interface ConsensusInitResponse {
  message: string;
  bls_threshold: number;
  active_oracles: string[];
}

// --- Chain API Types ---
export interface ChainAllResponse {
  source: string;
  overview: { sql: string; data: Array<Record<string, any>>; meta: any };
  activity: { sql: string; data: Array<Record<string, any>>; meta: any };
  transactions: { sql: string; data: Array<Record<string, any>>; meta: any };
  sentinel: {
    chainHealthScore: number;
    attestationReadiness: string;
    networkReliability: { rate7d: number; rate30d: number };
    congestion: { ratio: number; avgTx7d: number; avgTx30d: number };
    failTrend: { direction: string; rate3d: number; rate7d: number };
  };
}

// --- Extension Types ---

export interface AssetCategory {
  id: string;
  name: string;
  description: string;
  weights: Record<string, number>;
}

export interface KycCheckResult {
  publicKey: string;
  kycVerified: boolean;
  verifiedAt: string | null;
  kycLevel: string;
  scoreAdjustment: number;
}

export interface BridgeChain {
  chainId: number;
  name: string;
  bridgeContract: string;
  supported: boolean;
}

export interface BridgeVerifyResult {
  valid: boolean;
  chainName: string;
  proofHash: string;
  attestationHash: string;
}

export interface AnomalyDetectResult {
  anomalies: Array<{ assetId: string; type: string; severity: string; details: string }>;
}

export interface FactorDefinition {
  name: string;
  weight: number;
  description: string;
}

// --- API Client ---

async function fetcher<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' = 'GET',
  data?: any
): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const config: RequestInit = {
    method,
    headers: {} as Record<string, string>,
  };
  if (data && (method === 'POST' || method === 'PUT')) {
    (config.headers as Record<string, string>)['Content-Type'] = 'application/json';
    config.body = JSON.stringify(data);
  }
  const response = await fetch(url, config);
  if (!response.ok) {
    let msg = `Request failed (${response.status})`;
    try {
      const errBody = await response.json();
      msg = errBody.error || errBody.message || msg;
    } catch { /* ignore */ }
    throw { message: msg, statusCode: response.status } as ErrorResponse;
  }
  const json = await response.json();
  return json as T;
}

// Main
export const getHealth = () => fetcher<HealthResponse>('/health');
export const postPipeline = (body: PipelineRunRequest) => fetcher<PipelineRunResponse>('/api/v1/pipeline', 'POST', body);
export const getScores = async (): Promise<AssetScore[]> => {
  const res = await fetcher<any>('/api/v1/scores');
  const raw: any[] = Array.isArray(res) ? res : (res.scores || []);
  // Map backend shape (invoiceId/trustScore/scoredAt) → frontend shape
  return raw.map((r: any) => ({
    asset_id: r.asset_id || r.invoiceId || r.id || '',
    asset_type: r.asset_type || 'invoice',
    identifier: r.identifier || r.invoiceId || r.asset_id || '',
    score: r.score ?? r.trustScore ?? 0,
    factors: (r.factors || []).map((f: any) => ({
      name: f.name,
      score: f.score ?? 0,
      weight: f.weight ?? 0,
      details: f.details || f.evidence || '',
    })),
    timestamp: r.timestamp || r.scoredAt || new Date().toISOString(),
    isAboveThreshold: r.isAboveThreshold,
    metadata: r.metadata,
  }));
};
export const getStats = () => fetcher<StatsResponse>('/api/v1/stats');
export const getAttestations = (params?: { page?: number; limit?: number; status?: AttestationStatus; min_score?: number }) => {
  const q = new URLSearchParams();
  if (params?.page) q.set('page', String(params.page));
  if (params?.limit) q.set('limit', String(params.limit));
  if (params?.status) q.set('status', params.status);
  if (params?.min_score) q.set('min_score', String(params.min_score));
  const qs = q.toString();
  return fetcher<AttestationsResponse>(`/api/v1/attestations${qs ? '?' + qs : ''}`);
};
export const getAttestationById = (id: string) => fetcher<Attestation>(`/api/v1/attestations/${id}`);
export const getCacheStats = () => fetcher<CacheStatsResponse>('/api/v1/cache/stats');

// Data
export const getLEIData = (lei: string) => fetcher<LEIData>(`/api/v1/data/lei/${lei}`);
export const getPriceData = (symbol: string) => fetcher<PriceData>(`/api/v1/data/price/${symbol}`);
export const getCompanyData = (jurisdiction: string, id: string) => fetcher<CompanyData>(`/api/v1/data/company/${jurisdiction}/${id}`);
export const getDataCacheStats = () => fetcher<CacheStatsResponse>('/api/v1/data/cache/stats');
export const postDataCacheClear = () => fetcher<{ message: string }>('/api/v1/data/cache/clear', 'POST', {});

// Governance
export const postGovernancePropose = (body: ProposeRequest) => fetcher<{ proposalId: string }>('/api/v1/governance/propose', 'POST', body);
export const postGovernanceVote = (body: VoteRequest) => fetcher<{ message: string }>('/api/v1/governance/vote', 'POST', body);
export const getGovernanceProposals = async (): Promise<Proposal[]> => {
  const res = await fetcher<any>('/api/v1/governance/proposals');
  return Array.isArray(res) ? res : (res.proposals || []);
};
export const getGovernanceProposalById = (id: string) => fetcher<Proposal>(`/api/v1/governance/proposals/${id}`);
export const postGovernanceExecute = (body: ExecuteRequest) => fetcher<{ message: string }>('/api/v1/governance/execute', 'POST', body);

// Slashing
export const postSlashingReport = (body: ReportRequest) => fetcher<{ report_id: string }>('/api/v1/slashing/report', 'POST', body);
export const postSlashingChallenge = (body: ChallengeRequest) => fetcher<{ message: string }>('/api/v1/slashing/challenge', 'POST', body);
export const postSlashingValidate = (body: ValidateRequest) => fetcher<{ message: string }>('/api/v1/slashing/validate', 'POST', body);
export const postSlashingExecute = (body: SlashingExecuteRequest) => fetcher<{ message: string }>('/api/v1/slashing/execute', 'POST', body);
export const getSlashingReports = async (): Promise<SlashingReport[]> => {
  const res = await fetcher<any>('/api/v1/slashing/reports');
  return Array.isArray(res) ? res : (res.reports || []);
};
export const getSlashingReportById = (id: string) => fetcher<SlashingReport>(`/api/v1/slashing/reports/${id}`);

// Consensus — init requires body (attestationId, messageHash), so we don't call it on page load
export const postConsensusInit = (body: { attestationId: string; messageHash: string }) =>
  fetcher<ConsensusInitResponse>('/api/v1/consensus/init', 'POST', body);

// Chain
export const getChainAll = () => fetcher<ChainAllResponse>('/api/v1/chain/all');

// Extensions
export const getExtensionCategories = async (): Promise<{ categories: AssetCategory[] }> => {
  const raw = await fetcher<any>('/api/v1/extensions/categories');
  // Backend returns { categories: string[], weights: { [cat]: { ... } } }
  const cats: string[] = raw.categories || [];
  const weights: Record<string, Record<string, number>> = raw.weights || {};
  return {
    categories: cats.map((name: string) => ({
      id: name,
      name: name.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
      description: `${name.replace(/_/g, ' ')} asset category`,
      weights: weights[name] || {},
    })),
  };
};
export const getCategoryCompliance = (category: string) => fetcher<any>(`/api/v1/extensions/categories/${category}/compliance`);
export const postKycCheck = (submitterPublicKey: string) => fetcher<KycCheckResult>('/api/v1/extensions/kyc/check', 'POST', { submitterPublicKey });
export const getBridgeChains = () => fetcher<{ chains: BridgeChain[] }>('/api/v1/extensions/bridge/chains');
export const postBridgeVerify = (body: { chainId: number; contractAddress: string; attestationHash: string; tokenId?: string }) =>
  fetcher<BridgeVerifyResult>('/api/v1/extensions/bridge/verify', 'POST', body);

// Anomaly
export const postAnomalyDetect = (body?: { assetIds?: string[] }) => fetcher<AnomalyDetectResult>('/api/v1/anomalies/detect', 'POST', body || {});
export const getAnomalyReport = (assetId: string, period?: string) => {
  const q = period ? `?period=${period}` : '';
  return fetcher<any>(`/api/v1/anomalies/${assetId}/report${q}`);
};

// Factors
export const getFactors = () => fetcher<{ factors: FactorDefinition[] }>('/api/v1/factors');

// Documents
export const postDocumentVerify = (body: { hash: string; metadata?: Record<string, unknown> }) => fetcher<any>('/api/v1/documents/verify', 'POST', body);
export const postDocument = (body: { content: string; metadata?: Record<string, unknown> }) => fetcher<any>('/api/v1/documents', 'POST', body);
export const getDocumentStatus = (hash: string) => fetcher<any>(`/api/v1/documents/${hash}/status`);

// Asset History
export const getAssetHistory = (assetId: string) => fetcher<any>(`/api/v1/assets/${assetId}/history`);

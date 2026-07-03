

const BASE_URL = 'https://rwa-sentinel-api.onrender.com';

// --- General Types ---
export interface HealthResponse {
  status: string;
  version: string;
  timestamp: string;
}

export interface ErrorResponse {
  message: string;
  statusCode?: number;
  error?: string;
}

// --- Main API Types ---
export interface PipelineRunRequest {
  lei?: string;
  company_id?: string;
  jurisdiction?: string;
  symbol?: string;
  asset_type?: string; // e.g., 'equity', 'bond', 'commodity'
  metadata?: Record<string, any>;
}

export interface PipelineRunResponse {
  pipeline_id: string;
  status: string;
  timestamp: string;
}

export interface ScoreFactor {
  name: string;
  score: number;
  weight: number;
  details?: string;
}

export interface AssetScore {
  asset_id: string;
  asset_type: string;
  identifier: string; // e.g., LEI, company ID, symbol
  score: number;
  factors: ScoreFactor[];
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface StatsResponse {
  total_scored_assets: number;
  active_attestations: number;
  average_trust_score: number;
  last_pipeline_run: string;
  pipeline_runs_24h: number;
  total_attestations: number;
  total_proposals: number;
  total_oracles: number;
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
export type ProposalStatus = 'pending' | 'active' | 'passed' | 'failed' | 'executed';

export interface Proposal {
  id: string;
  proposer: string;
  title: string;
  description: string;
  status: ProposalStatus;
  start_time: string;
  end_time: string;
  votes_for: number;
  votes_against: number;
  quorum_reached: boolean;
  execution_hash?: string;
  metadata?: Record<string, any>;
}

export interface ProposeRequest {
  title: string;
  description: string;
  target_contract?: string;
  target_method?: string;
  parameters?: Record<string, any>;
  duration_days?: number;
}

export interface VoteRequest {
  proposal_id: string;
  voter: string;
  support: boolean; // true for 'for', false for 'against'
  weight?: number; // e.g., token balance
}

export interface ExecuteRequest {
  proposal_id: string;
  executor: string;
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
export interface ChainOverviewResponse {
  block_height: number;
  total_transactions: number;
  average_block_time_s: number;
  total_validators: number;
  last_block_timestamp: string;
}

export interface ChainActivityEntry {
  timestamp: string;
  transactions: number;
  attestations_minted: number;
  proposals_created: number;
}

export interface ChainActivityResponse {
  activity: ChainActivityEntry[];
}

export interface Transaction {
  hash: string;
  block_hash: string;
  timestamp: string;
  sender: string;
  receiver: string;
  amount: number;
  status: string;
  type: string; // e.g., 'deploy', 'transfer', 'contract_call'
}

export interface ChainTransactionsResponse {
  transactions: Transaction[];
  total: number;
  page: number;
  limit: number;
}

// --- API Client Functions ---

async function fetcher<T>(
  endpoint: string,
  method: 'GET' | 'POST' = 'GET',
  data?: any
): Promise<T> {
  try {
    const url = `${BASE_URL}${endpoint}`;
    const config: RequestInit = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (data && method === 'POST') {
      config.body = JSON.stringify(data);
    }
    const response = await fetch(url, config);
    const json = await response.json();
    if (!response.ok) {
      throw json as ErrorResponse;
    }
    return json as T;
  } catch (error: any) {
    if (error && error.message) {
      throw error as ErrorResponse;
    }
    throw { message: (error as Error).message || 'An unknown error occurred', statusCode: 500 } as ErrorResponse;
  }
}

// Main
export const getHealth = () => fetcher<HealthResponse>('/health');
export const postPipeline = (body: PipelineRunRequest) => fetcher<PipelineRunResponse>('/api/v1/pipeline', 'POST', body);
export const getScores = () => fetcher<AssetScore[]>('/api/v1/scores');
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
export const postDataCacheClear = () => fetcher<{ message: string }>('/api/v1/data/cache/clear', 'POST');

// Governance
export const postGovernancePropose = (body: ProposeRequest) => fetcher<{ proposal_id: string }>('/api/v1/governance/propose', 'POST', body);
export const postGovernanceVote = (body: VoteRequest) => fetcher<{ message: string }>('/api/v1/governance/vote', 'POST', body);
export const getGovernanceProposals = () => fetcher<Proposal[]>('/api/v1/governance/proposals');
export const getGovernanceProposalById = (id: string) => fetcher<Proposal>(`/api/v1/governance/proposals/${id}`);
export const postGovernanceExecute = (body: ExecuteRequest) => fetcher<{ message: string }>('/api/v1/governance/execute', 'POST', body);

// Slashing
export const postSlashingReport = (body: ReportRequest) => fetcher<{ report_id: string }>('/api/v1/slashing/report', 'POST', body);
export const postSlashingChallenge = (body: ChallengeRequest) => fetcher<{ message: string }>('/api/v1/slashing/challenge', 'POST', body);
export const postSlashingValidate = (body: ValidateRequest) => fetcher<{ message: string }>('/api/v1/slashing/validate', 'POST', body);
export const postSlashingExecute = (body: SlashingExecuteRequest) => fetcher<{ message: string }>('/api/v1/slashing/execute', 'POST', body);
export const getSlashingReports = () => fetcher<SlashingReport[]>('/api/v1/slashing/reports');
export const getSlashingReportById = (id: string) => fetcher<SlashingReport>(`/api/v1/slashing/reports/${id}`);

// Consensus
export const postConsensusInit = () => fetcher<ConsensusInitResponse>('/api/v1/consensus/init', 'POST'); // Assuming this returns current BLS threshold and active oracles

// Chain
export const getChainAll = () => fetcher<any>('/api/v1/chain/all'); // Generic for now, as specific type not provided
export const getChainOverview = () => fetcher<ChainOverviewResponse>('/api/v1/chain/overview');
export const getChainActivity = () => fetcher<ChainActivityResponse>('/api/v1/chain/activity');
export const getChainTransactions = (params?: { page?: number; limit?: number }) => {
  const q = new URLSearchParams();
  if (params?.page) q.set('page', String(params.page));
  if (params?.limit) q.set('limit', String(params.limit));
  const qs = q.toString();
  return fetcher<Transaction[]>(`/api/v1/chain/transactions${qs ? '?' + qs : ''}`);
}; limit?: number }) =>
  fetcher<ChainTransactionsResponse>('/api/v1/chain/transactions', 'GET', { params });

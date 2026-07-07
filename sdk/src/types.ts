// sdk/src/types.ts

export interface Attestation {
  id: string;
  assetId: string;
  score: number;
  status: AttestationStatus;
  oracle: string;
  timestamp: number;
  metadata?: any;
}

export interface AttestationInput {
  assetId: string;
  assetType: string;
  dataUrl: string;
  metadata?: any;
}

export interface AttestationResult {
  attestationId: string;
  score: number;
  status: AttestationStatus;
  txHash: string;
}

export interface OracleScore {
  assetId: string;
  composite: number;
  factors: ScoringFactors;
  confidence: number;
  updatedAt: number;
}

/** Matches the 6-factor scoring pipeline in agent/src/validator/scoringFactors.ts */
export interface ScoringFactors {
  issuerHistory: number;
  debtorRating: number;
  crossReference: number;
  amountReasonableness: number;
  timeValidity: number;
  invoiceDetailLevel: number;
}

export interface ScoringWeights {
  issuerHistory: number;          // 25%
  debtorRating: number;           // 20%
  crossReference: number;         // 15%
  amountReasonableness: number;   // 15%
  timeValidity: number;           // 15%
  invoiceDetailLevel: number;     // 10%
}

export interface OracleQuery {
  assetId?: string;
  assetType?: string;
  minScore?: number;
  dateRange?: { from: string; to: string };
}

export interface OracleResponse {
  results: Attestation[];
  total: number;
  page: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface Proposal {
  id: string;
  title: string;
  description: string;
  type: string;
  status: ProposalStatus;
  votes: { [key: string]: VoteType };
  quorum: number;
  createdAt: number;
  endsAt: number;
}

export interface ProposalInput {
  title: string;
  description: string;
  type: string;
}

export interface VoteResult {
  proposalId: string;
  vote: VoteType;
  txHash: string;
}

export interface SlashingReport {
  id: string;
  oracleId: string;
  reason: string;
  evidence: string;
  status: SlashingStatus;
  penalty: number;
}

export interface SlashingInput {
  oracleId: string;
  reason: string;
  evidence: string;
}

export interface ChallengeResult {
  reportId: string;
  resolved: boolean;
  outcome: string;
}

export interface ConsensusState {
  threshold: number;
  totalOracles: number;
  onlineOracles: number;
  signatures: number;
  aggregated: boolean;
}

export interface SentinelEvent {
  type: string;
  data: any;
  timestamp: number;
}

export interface OracleNode {
  id: string;
  address: string;
  stake: number;
  isOnline: boolean;
  latencyMs: number;
}

export interface ProtocolStats {
  totalScored: number;
  activeAttestations: number;
  expiredAttestations: number;
  avgTrustScore: number;
  assetTypes: Record<string, number>;
}

export enum AttestationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
  CHALLENGED = 'challenged',
  INVALIDATED = 'invalidated',
}

export enum ProposalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXECUTED = 'executed',
}

export enum SlashingStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXECUTED = 'executed',
}

export enum VoteType {
  FOR = 'for',
  AGAINST = 'against',
  ABSTAIN = 'abstain',
}

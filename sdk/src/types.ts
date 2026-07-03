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

export interface ScoringFactors {
  lei: number;
  priceCorrelation: number;
  compliance: number;
  historyDepth: number;
  crossReference: number;
}

export interface OracleQuery {
  assetId?: string;
  assetType?: string;
  minScore?: number;
  dateRange?: { start: number; end: number };
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

export interface ScoringWeights {
  lei: number;
  priceCorrelation: number;
  compliance: number;
  historyDepth: number;
  crossReference: number;
}

export enum AttestationStatus {
  PENDING,
  APPROVED,
  REJECTED,
}

export enum ProposalStatus {
  PENDING,
  APPROVED,
  REJECTED,
}

export enum SlashingStatus {
  PENDING,
  APPROVED,
  REJECTED,
}

export enum VoteType {
  YES,
  NO,
  ABSTAIN,
}

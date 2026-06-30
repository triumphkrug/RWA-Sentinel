const API_BASE = 'https://rwa-sentinel-api.onrender.com'

async function request<T>(path: string, opts?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...opts?.headers },
    ...opts,
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`API ${res.status}: ${body}`)
  }
  return res.json()
}

export interface ScoreFactor {
  name: string
  weight: number
  score: number
  evidence: string
}

export interface ScoreResult {
  invoiceId: string
  trustScore: number
  factors: ScoreFactor[]
  factorsHash: string
  evidenceHash: string
  scoredAt: string
  isAboveThreshold: boolean
}

export interface PipelineResult {
  generated: number
  collected: number
  scored: number
  passing: number
  crossRefResults: { invoiceId: string; passed: boolean }[]
  cacheSize: number
}

export interface CacheStats {
  size: number
  staleKeys: string[]
}

export interface HealthResponse {
  status: string
  uptime: number
  timestamp: string
  chain?: string
  contracts?: Record<string, string>
  totalScored?: number
}

export interface StatsResponse {
  totalScored: number
  activeAttestations: number
  expiredAttestations: number
  avgTrustScore: number
  assetTypes: Record<string, number>
}

export interface AttestationListResponse {
  attestations: ScoreResult[]
  total: number
  page: number
  limit: number
}

export function getHealth(): Promise<HealthResponse> {
  return request('/health')
}

export function runPipeline(): Promise<PipelineResult> {
  return request('/api/v1/pipeline', { method: 'POST', body: '{}' })
}

export function getScores(): Promise<{ scores: ScoreResult[] }> {
  return request('/api/v1/scores')
}

export function getCacheStats(): Promise<CacheStats> {
  return request('/api/v1/cache/stats')
}

export function getStats(): Promise<StatsResponse> {
  return request('/api/v1/stats')
}

export function getAttestations(params?: {
  page?: number
  limit?: number
  status?: string
  minScore?: number
}): Promise<AttestationListResponse> {
  const qs = new URLSearchParams()
  if (params?.page) qs.set('page', String(params.page))
  if (params?.limit) qs.set('limit', String(params.limit))
  if (params?.status) qs.set('status', params.status)
  if (params?.minScore) qs.set('min_score', String(params.minScore))
  const q = qs.toString()
  return request(`/api/v1/attestations${q ? '?' + q : ''}`)
}

export function getAttestation(id: string): Promise<ScoreResult> {
  return request(`/api/v1/attestations/${encodeURIComponent(id)}`)
}

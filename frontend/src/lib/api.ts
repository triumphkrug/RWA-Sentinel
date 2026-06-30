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
}

export function getHealth(): Promise<HealthResponse> {
  return request('/health')
}

export function runPipeline(): Promise<PipelineResult> {
  return request('/api/v1/pipeline', { method: 'POST' })
}

export function getScores(): Promise<{ scores: ScoreResult[] }> {
  return request('/api/v1/scores')
}

export function getCacheStats(): Promise<CacheStats> {
  return request('/api/v1/cache/stats')
}

import { useState } from 'react'
import { Database, Search, RefreshCw, CheckCircle, XCircle, Globe, Landmark, BarChart3, Building2 } from 'lucide-react'
import PageInfo from './PageInfo'

const API = import.meta.env.VITE_API_URL || ''

interface AdapterResult {
  source: string
  status: 'success' | 'error'
  data: unknown
  latency: number
}

const adapters = [
  {
    name: 'GLEIF LEI Registry',
    description: 'Global Legal Entity Identifier Foundation — validates entity registration, legal name, jurisdiction, and active status.',
    endpoint: '/api/v1/data/lei/',
    placeholder: '5493001KJTIIGC8Y1R12',
    paramLabel: 'LEI Code',
    Icon: Landmark,
  },
  {
    name: 'CoinGecko Market Data',
    description: 'Real-time cryptocurrency pricing, market cap, and 24h volume for cross-reference validation.',
    endpoint: '/api/v1/data/price/',
    placeholder: 'bitcoin',
    paramLabel: 'Symbol',
    Icon: BarChart3,
  },
  {
    name: 'OpenCorporates / Companies House',
    description: 'Company registry lookup — registered office, officers, filing history, dissolution status.',
    endpoint: '/api/v1/data/company/gb/',
    placeholder: '00445790',
    paramLabel: 'Company ID (UK)',
    Icon: Building2,
  },
]

export default function DataAdapters() {
  const [results, setResults] = useState<Record<string, AdapterResult>>({})
  const [inputs, setInputs] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [cacheStats, setCacheStats] = useState<Record<string, unknown> | null>(null)

  const query = async (adapter: typeof adapters[0]) => {
    const val = inputs[adapter.name] || adapter.placeholder
    setLoading(prev => ({ ...prev, [adapter.name]: true }))
    const start = Date.now()
    try {
      const res = await fetch(`${API}${adapter.endpoint}${encodeURIComponent(val)}`)
      const data = await res.json()
      setResults(prev => ({
        ...prev,
        [adapter.name]: { source: adapter.name, status: res.ok ? 'success' : 'error', data, latency: Date.now() - start },
      }))
    } catch (e) {
      setResults(prev => ({
        ...prev,
        [adapter.name]: { source: adapter.name, status: 'error', data: { error: (e as Error).message }, latency: Date.now() - start },
      }))
    } finally {
      setLoading(prev => ({ ...prev, [adapter.name]: false }))
    }
  }

  const fetchCacheStats = async () => {
    try {
      const res = await fetch(`${API}/api/v1/data/cache/stats`)
      const data = await res.json()
      setCacheStats(data)
    } catch {
      setCacheStats({ error: 'Failed to fetch cache stats' })
    }
  }

  const clearCache = async () => {
    try {
      await fetch(`${API}/api/v1/data/cache/clear`, { method: 'POST' })
      setCacheStats(null)
      fetchCacheStats()
    } catch { /* ignore */ }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Database className="h-6 w-6 text-blue-600" /> Data Adapters
        </h2>
        <p className="text-gray-500 mt-1">
          Live external data sources used in the 6-factor scoring pipeline for cross-reference validation
        </p>
      </div>

      <PageInfo title="What are Data Adapters?">
        <p>Data adapters are the external data sources powering the <strong>cross-reference validation factor</strong> in the 6-factor scoring pipeline. Each adapter queries a real third-party API to independently verify asset claims against authoritative registries.</p>
        <p className="mt-1"><strong>GLEIF:</strong> Validates legal entity identity via the Global LEI Foundation. <strong>CoinGecko:</strong> Cross-references market pricing data. <strong>Companies House:</strong> Verifies UK corporate registry status. Results are cached for 15 minutes to reduce API load. Individual adapter failures gracefully degrade the cross-reference score rather than blocking the pipeline.</p>
      </PageInfo>

      {/* Adapter cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {adapters.map(adapter => {
          const result = results[adapter.name]
          const isLoading = loading[adapter.name]
          return (
            <div key={adapter.name} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col">
              <div className="flex items-start gap-3 mb-3">
                <div className="p-2 rounded-lg bg-blue-50 shrink-0">
                  <adapter.Icon className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{adapter.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{adapter.description}</p>
                </div>
              </div>

              <div className="flex gap-2 mt-auto pt-3">
                <input
                  type="text"
                  placeholder={adapter.placeholder}
                  value={inputs[adapter.name] || ''}
                  onChange={e => setInputs(prev => ({ ...prev, [adapter.name]: e.target.value }))}
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => query(adapter)}
                  disabled={isLoading}
                  className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  Query
                </button>
              </div>

              {result && (
                <div className="mt-3 rounded-lg bg-gray-50 border border-gray-100 p-3 max-h-48 overflow-y-auto">
                  <div className="flex items-center gap-2 mb-2 text-xs">
                    {result.status === 'success'
                      ? <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                      : <XCircle className="h-3.5 w-3.5 text-red-500" />
                    }
                    <span className={result.status === 'success' ? 'text-green-700' : 'text-red-600'}>
                      {result.status === 'success' ? 'Success' : 'Error'}
                    </span>
                    <span className="text-gray-400 ml-auto">{result.latency}ms</span>
                  </div>
                  <pre className="text-xs text-gray-600 whitespace-pre-wrap break-all">
                    {JSON.stringify(result.data, null, 2).slice(0, 1000)}
                  </pre>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Note about external APIs */}
      <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 text-sm text-amber-800">
        <p className="font-medium mb-1">External API Limitations</p>
        <p>CoinGecko free tier has rate limits (10-30 req/min). OpenCorporates requires an API key for full access. These adapters are designed for cross-reference validation — individual query failures don't block the pipeline, they reduce the cross-reference score factor instead.</p>
      </div>

      {/* Cache management */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Globe className="h-5 w-5 text-blue-600" /> Adapter Cache
          </h3>
          <div className="flex gap-2">
            <button
              onClick={fetchCacheStats}
              className="text-sm text-blue-600 hover:underline"
            >
              View stats
            </button>
            <button
              onClick={clearCache}
              className="text-sm text-red-500 hover:underline"
            >
              Clear cache
            </button>
          </div>
        </div>
        {cacheStats && (
          <pre className="bg-gray-50 rounded-lg p-4 text-xs text-gray-600 overflow-x-auto">
            {JSON.stringify(cacheStats, null, 2)}
          </pre>
        )}
        <p className="text-xs text-gray-400 mt-2">
          Data adapters cache responses for 15 minutes to reduce external API load. Allium chain data caches for 30 minutes.
        </p>
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link2, Activity, ArrowUpRight, RefreshCw, Layers } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || ''

interface ChainOverview {
  network?: string
  total_deploys?: number
  active_validators?: number
  block_height?: number
  [key: string]: unknown
}

interface ActivityEntry {
  date?: string
  tx_count?: number
  [key: string]: unknown
}

interface Transaction {
  deploy_hash?: string
  amount?: string
  from?: string
  to?: string
  timestamp?: string
  [key: string]: unknown
}

export default function ChainExplorer() {
  const [overview, setOverview] = useState<ChainOverview | null>(null)
  const [activity, setActivity] = useState<ActivityEntry[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = async () => {
    setLoading(true)
    setError(null)
    try {
      const [ovRes, actRes, txRes] = await Promise.allSettled([
        fetch(`${API}/api/v1/chain/overview`).then(r => r.json()),
        fetch(`${API}/api/v1/chain/activity`).then(r => r.json()),
        fetch(`${API}/api/v1/chain/transactions`).then(r => r.json()),
      ])
      if (ovRes.status === 'fulfilled') setOverview(ovRes.value?.data || ovRes.value || null)
      if (actRes.status === 'fulfilled') {
        const d = actRes.value?.data || actRes.value
        setActivity(Array.isArray(d) ? d.slice(0, 14) : [])
      }
      if (txRes.status === 'fulfilled') {
        const d = txRes.value?.data || txRes.value
        setTransactions(Array.isArray(d) ? d.slice(0, 20) : [])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load chain data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [])

  const shortHash = (h: string) => h && h.length > 16 ? `${h.slice(0, 8)}…${h.slice(-6)}` : h

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Link2 className="h-6 w-6 text-blue-600" /> Chain Explorer
          </h1>
          <p className="text-gray-500 mt-1">Live Casper testnet analytics via Allium</p>
        </div>
        <button
          onClick={fetchAll}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">{error}</div>
      )}

      {/* Overview cards */}
      {overview && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Network', value: overview.network || 'casper-test', icon: Layers },
            { label: 'Block Height', value: overview.block_height?.toLocaleString() || '—' },
            { label: 'Total Deploys', value: overview.total_deploys?.toLocaleString() || '—' },
            { label: 'Active Validators', value: overview.active_validators?.toLocaleString() || '—' },
          ].map(card => (
            <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{card.label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Activity chart (simple bar representation) */}
      {activity.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <Activity className="h-5 w-5 text-blue-600" /> Daily Transaction Activity
          </h2>
          <div className="flex items-end gap-1 h-32">
            {activity.map((entry, i) => {
              const max = Math.max(...activity.map(a => a.tx_count || 0), 1)
              const height = ((entry.tx_count || 0) / max) * 100
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1" title={`${entry.date}: ${entry.tx_count} txs`}>
                  <div
                    className="w-full bg-blue-500 rounded-t-sm min-h-[2px] transition-all"
                    style={{ height: `${Math.max(height, 2)}%` }}
                  />
                  <span className="text-[10px] text-gray-400 truncate w-full text-center">
                    {entry.date?.slice(-5) || ''}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Transactions table */}
      {transactions.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Recent Large Transactions</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="px-6 py-3 text-left">Deploy Hash</th>
                  <th className="px-6 py-3 text-left">From</th>
                  <th className="px-6 py-3 text-left">To</th>
                  <th className="px-6 py-3 text-right">Amount</th>
                  <th className="px-6 py-3 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transactions.map((tx, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-mono text-xs">
                      {tx.deploy_hash ? (
                        <a
                          href={`https://testnet.cspr.live/deploy/${tx.deploy_hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline inline-flex items-center gap-1"
                        >
                          {shortHash(tx.deploy_hash)} <ArrowUpRight className="h-3 w-3" />
                        </a>
                      ) : '—'}
                    </td>
                    <td className="px-6 py-3 font-mono text-xs text-gray-600">
                      {tx.from ? shortHash(tx.from) : '—'}
                    </td>
                    <td className="px-6 py-3 font-mono text-xs text-gray-600">
                      {tx.to ? shortHash(tx.to) : '—'}
                    </td>
                    <td className="px-6 py-3 text-right font-medium">{tx.amount || '—'}</td>
                    <td className="px-6 py-3 text-right text-xs text-gray-500">
                      {tx.timestamp ? new Date(tx.timestamp).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {loading && !overview && (
        <div className="text-center py-12 text-gray-400">Loading chain data…</div>
      )}
    </div>
  )
}

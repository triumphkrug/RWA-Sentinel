import { useEffect, useState } from 'react'
import { Link2, Activity, ArrowUpRight, RefreshCw, Layers, Loader2 } from 'lucide-react'
import { getChainAll, ChainAllResponse } from '../../lib/api'

export default function ChainExplorer() {
  const [data, setData] = useState<ChainAllResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await getChainAll()
      setData(result)
    } catch (e: any) {
      setError(e.message || 'Failed to load chain data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [])

  const shortHash = (h: string) => h && h.length > 16 ? `${h.slice(0, 8)}…${h.slice(-6)}` : h

  const overview = data?.overview?.data?.[0]
  const activityData = data?.activity?.data || []
  const transactions = data?.transactions?.data || []
  const sentinel = data?.sentinel

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Link2 className="h-6 w-6 text-blue-600" /> Chain Explorer
          </h2>
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

      {loading && !data && (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="ml-3 text-gray-600">Loading chain data...</p>
        </div>
      )}

      {/* Overview cards */}
      {overview && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Latest Block</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{Number(overview.latest_block).toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Current Era</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{Number(overview.current_era).toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Transactions</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{Number(overview.total_transactions).toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Validators</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{Number(overview.unique_validators).toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* Sentinel Health */}
      {sentinel && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <Layers className="h-5 w-5 text-blue-600" /> Sentinel Network Health
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <p className="text-xs text-green-700 font-medium">Health Score</p>
              <p className="text-2xl font-bold text-green-900">{sentinel.chainHealthScore}/100</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <p className="text-xs text-blue-700 font-medium">Attestation Readiness</p>
              <p className="text-lg font-bold text-blue-900 capitalize">{sentinel.attestationReadiness}</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-4 text-center">
              <p className="text-xs text-amber-700 font-medium">Reliability (7d)</p>
              <p className="text-2xl font-bold text-amber-900">{sentinel.networkReliability.rate7d}%</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-xs text-gray-700 font-medium">Avg Tx/day (7d)</p>
              <p className="text-2xl font-bold text-gray-900">{sentinel.congestion.avgTx7d.toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      {/* Daily Activity */}
      {activityData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <Activity className="h-5 w-5 text-blue-600" /> Daily Transaction Activity
          </h3>
          <div className="flex items-end gap-1 h-32">
            {activityData.slice(0, 14).map((entry: any, i: number) => {
              const max = Math.max(...activityData.map((a: any) => Number(a.tx_count) || 0), 1)
              const height = ((Number(entry.tx_count) || 0) / max) * 100
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1" title={`${entry.day}: ${entry.tx_count} txs`}>
                  <div
                    className="w-full bg-blue-500 rounded-t-sm min-h-[2px] transition-all"
                    style={{ height: `${Math.max(height, 2)}%` }}
                  />
                  <span className="text-[10px] text-gray-400 truncate w-full text-center">
                    {String(entry.day || '').slice(5, 10)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Transactions */}
      {transactions.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="px-6 py-3 text-left">Deploy Hash</th>
                  <th className="px-6 py-3 text-left">Initiator</th>
                  <th className="px-6 py-3 text-right">Amount (CSPR)</th>
                  <th className="px-6 py-3 text-right">Status</th>
                  <th className="px-6 py-3 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transactions.slice(0, 20).map((tx: any, i: number) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-mono text-xs">
                      {tx.deploy_hash || tx.transaction_hash ? (
                        <a
                          href={`https://testnet.cspr.live/deploy/${tx.deploy_hash || tx.transaction_hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline inline-flex items-center gap-1"
                        >
                          {shortHash(tx.deploy_hash || tx.transaction_hash)} <ArrowUpRight className="h-3 w-3" />
                        </a>
                      ) : '—'}
                    </td>
                    <td className="px-6 py-3 font-mono text-xs text-gray-600">
                      {tx.initiator ? shortHash(tx.initiator) : tx.from ? shortHash(tx.from) : '—'}
                    </td>
                    <td className="px-6 py-3 text-right font-medium">
                      {tx.amount_motes ? (Number(tx.amount_motes) / 1e9).toFixed(2) : tx.amount || '—'}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        tx.transaction_result === 'Success' || tx.status === 'success'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {tx.transaction_result || tx.status || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right text-xs text-gray-500">
                      {tx.block_timestamp || tx.timestamp
                        ? new Date(tx.block_timestamp || tx.timestamp).toLocaleString()
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

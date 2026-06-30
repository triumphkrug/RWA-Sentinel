import { useState, useRef, useEffect, useCallback } from 'react'
import { FileSearch, BarChart3, Clock, Shield, Activity, Search, AlertTriangle, Wallet, LogOut, Database, Loader2 } from 'lucide-react'
import { runPipeline, getScores, getCacheStats, getHealth } from '../lib/api'
import type { ScoreResult, PipelineResult } from '../lib/api'
import { connectWallet, disconnectWallet, shortKey } from '../lib/wallet'
import type { WalletState } from '../lib/wallet'

interface LogLine { time: string; text: string; type: 'info' | 'success' | 'warn' | 'error' | 'hash' }

export default function Dashboard() {
  const [scores, setScores] = useState<ScoreResult[]>([])
  const [running, setRunning] = useState(false)
  const [log, setLog] = useState<LogLine[]>([])
  const [lookupId, setLookupId] = useState('')
  const [lookupResult, setLookupResult] = useState<string | null>(null)
  const [wallet, setWallet] = useState<WalletState>({ connected: false, publicKey: null, accountHash: null, simulated: false })
  const [chainStatus, setChainStatus] = useState<string>('connecting...')
  const [cacheSize, setCacheSize] = useState(0)
  const [lastPipeline, setLastPipeline] = useState<PipelineResult | null>(null)
  const logRef = useRef<HTMLDivElement>(null)

  const addLine = useCallback((l: LogLine) => {
    setLog(p => [...p, l])
    setTimeout(() => logRef.current?.scrollTo({ top: 9999, behavior: 'smooth' }), 50)
  }, [])

  useEffect(() => {
    getHealth()
      .then(h => setChainStatus(h.status === 'ok' ? 'casper-test' : 'offline'))
      .catch(() => setChainStatus('offline'))
  }, [])

  const handleConnect = async () => {
    if (wallet.connected) {
      setWallet(disconnectWallet())
      setScores([])
      return
    }
    const state = await connectWallet()
    setWallet(state)
    try {
      const data = await getScores()
      setScores(data.scores)
      const cache = await getCacheStats()
      setCacheSize(cache.size)
    } catch { /* ignore */ }
  }

  const handleRunPipeline = async () => {
    if (running || !wallet.connected) return
    setRunning(true)
    setLog([])
    const ts = () => (performance.now() / 1000).toFixed(3)
    addLine({ time: ts(), text: 'Starting verification pipeline...', type: 'info' })
    addLine({ time: ts(), text: `Account: ${shortKey(wallet.publicKey || '')}`, type: 'info' })
    try {
      addLine({ time: ts(), text: 'Calling backend pipeline...', type: 'info' })
      const result = await runPipeline()
      setLastPipeline(result)
      addLine({ time: ts(), text: `Generated ${result.generated} invoices`, type: 'info' })
      addLine({ time: ts(), text: `Collected: ${result.collected} | Scored: ${result.scored}`, type: 'info' })
      addLine({ time: ts(), text: `Passing threshold: ${result.passing}/${result.scored}`, type: result.passing > 0 ? 'success' : 'warn' })
      for (const xr of result.crossRefResults) {
        addLine({ time: ts(), text: `  ${xr.invoiceId}: cross-ref ${xr.passed ? 'PASS' : 'FAIL'}`, type: xr.passed ? 'success' : 'warn' })
      }
      addLine({ time: ts(), text: `Cache size: ${result.cacheSize}`, type: 'info' })
      setCacheSize(result.cacheSize)
      const freshScores = await getScores()
      setScores(freshScores.scores)
      addLine({ time: ts(), text: `Pipeline complete. ${freshScores.scores.length} scores available.`, type: 'success' })
    } catch (err) {
      addLine({ time: ts(), text: `Error: ${err instanceof Error ? err.message : String(err)}`, type: 'error' })
    }
    setRunning(false)
  }

  const handleLookup = () => {
    const f = scores.find(s => s.invoiceId === lookupId.trim())
    if (f) {
      setLookupResult(`Found | ${f.invoiceId} | Score: ${f.trustScore} | ${f.isAboveThreshold ? 'PASSED' : 'BELOW THRESHOLD'} | ${f.scoredAt}`)
    } else {
      setLookupResult('No attestation found for this ID.')
    }
  }

  const active = scores.filter(s => s.isAboveThreshold).length
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, s) => a + s.trustScore, 0) / scores.length) : 0

  return (
    <div className="min-h-screen bg-slate-50 pt-20">
      <div className="rwa-section py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Oracle Dashboard</h1>
            <p className="text-gray-500 text-sm mt-1">Run the verification pipeline and inspect attestations</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-xs">
              <span className={`w-2 h-2 rounded-full ${chainStatus === 'casper-test' ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-gray-600 font-medium">{chainStatus}</span>
            </div>
            <button
              onClick={handleConnect}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                wallet.connected
                  ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                  : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
              }`}
            >
              {wallet.connected ? <LogOut className="w-4 h-4" /> : <Wallet className="w-4 h-4" />}
              {wallet.connected ? shortKey(wallet.publicKey || '') : 'Connect Wallet'}
            </button>
          </div>
        </div>

        {!wallet.connected ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
            <Wallet className="w-12 h-12 text-blue-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Connect your wallet to begin</h2>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              Connect a Casper Signer or CasperWallet to run the verification pipeline and view attestation results.
            </p>
            <button onClick={handleConnect} className="inline-flex items-center gap-2 px-8 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors">
              <Wallet className="w-4 h-4" /> Connect Wallet
            </button>
          </div>
        ) : (
          <>
            {/* Stats cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {[
                { icon: FileSearch, label: 'Total Scores', val: scores.length, color: 'text-blue-600 bg-blue-50' },
                { icon: Shield, label: 'Active Attestations', val: active, color: 'text-green-600 bg-green-50' },
                { icon: BarChart3, label: 'Avg Trust Score', val: avgScore, color: 'text-amber-600 bg-amber-50' },
                { icon: Database, label: 'Cache Size', val: cacheSize, color: 'text-purple-600 bg-purple-50' },
              ].map((s, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className={`w-9 h-9 rounded-lg ${s.color} flex items-center justify-center mb-3`}>
                    <s.icon className="w-4 h-4" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{s.val}</p>
                  <p className="text-xs text-gray-500 font-medium">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              {/* Pipeline control */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue-600" /> Pipeline
                  </h3>
                  <button
                    onClick={handleRunPipeline}
                    disabled={running}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all"
                  >
                    {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                    {running ? 'Running...' : 'Run Pipeline'}
                  </button>
                </div>

                {/* Log output */}
                <div ref={logRef} className="bg-gray-900 rounded-xl p-4 h-64 overflow-y-auto font-mono text-xs">
                  {log.length === 0 && <p className="text-gray-500">Pipeline output will appear here...</p>}
                  {log.map((l, i) => (
                    <div key={i} className="flex gap-2 mb-1">
                      <span className="text-gray-500 shrink-0">[{l.time}]</span>
                      <span className={
                        l.type === 'success' ? 'text-green-400' :
                        l.type === 'error' ? 'text-red-400' :
                        l.type === 'warn' ? 'text-amber-400' :
                        l.type === 'hash' ? 'text-blue-400' : 'text-gray-300'
                      }>{l.text}</span>
                    </div>
                  ))}
                </div>

                {lastPipeline && (
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <div className="bg-blue-50 rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-blue-700">{lastPipeline.generated}</p>
                      <p className="text-[10px] text-blue-600">Generated</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-green-700">{lastPipeline.passing}</p>
                      <p className="text-[10px] text-green-600">Passing</p>
                    </div>
                    <div className="bg-amber-50 rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-amber-700">{lastPipeline.scored - lastPipeline.passing}</p>
                      <p className="text-[10px] text-amber-600">Rejected</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Score lookup + table */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
                  <Search className="w-4 h-4 text-blue-600" /> Attestation Lookup
                </h3>
                <div className="flex gap-2 mb-4">
                  <input
                    value={lookupId}
                    onChange={e => setLookupId(e.target.value)}
                    placeholder="Enter Invoice ID (e.g. INV-7F99339A)"
                    className="flex-1 px-4 py-2.5 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button onClick={handleLookup} className="px-4 py-2.5 bg-gray-100 rounded-lg text-gray-700 hover:bg-gray-200 transition-colors">
                    <Search className="w-4 h-4" />
                  </button>
                </div>
                {lookupResult && (
                  <div className="mb-4 p-3 rounded-lg bg-blue-50 text-blue-800 text-sm font-mono">{lookupResult}</div>
                )}

                {/* Score list */}
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {scores.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-8">No scores yet. Run the pipeline to generate attestations.</p>
                  ) : (
                    scores.map((s, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                        <div>
                          <p className="font-mono text-sm font-semibold text-gray-900">{s.invoiceId}</p>
                          <p className="text-xs text-gray-500">{s.scoredAt}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold text-gray-900">{s.trustScore}</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            s.isAboveThreshold ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {s.isAboveThreshold ? 'PASS' : 'FAIL'}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

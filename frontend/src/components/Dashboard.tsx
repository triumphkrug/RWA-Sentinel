import { useState, useRef, useEffect, useCallback } from 'react'
import {
  FileSearch, BarChart3, Clock, Shield, Activity, Search,
  Wallet, LogOut, Database, Loader2, ExternalLink, Eye,
  AlertTriangle, CheckCircle, XCircle, RefreshCw
} from 'lucide-react'
import { runPipeline, getScores, getCacheStats, getHealth } from '../lib/api'
import type { ScoreResult, PipelineResult } from '../lib/api'
import { connectWallet, disconnectWallet, shortKey } from '../lib/wallet'
import type { WalletState } from '../lib/wallet'

interface LogLine { time: string; text: string; type: 'info' | 'success' | 'warn' | 'error' | 'hash' }

/* ── demo scored assets (shown publicly without wallet) ── */
const demoAssets = [
  { id: 'INV-A7F1001', issuer: 'Acme Logistics', debtor: 'Metro Corp', amount: 84250, score: 87, status: 'active', type: 'Invoice', expires: '23h 14m' },
  { id: 'INV-B3E2045', issuer: 'Nordic Shipping', debtor: 'Baltic Trade', amount: 215000, score: 72, status: 'active', type: 'Trade Receivable', expires: '18h 02m' },
  { id: 'RE-CF4R001', issuer: 'Urban Realty', debtor: 'N/A', amount: 490000, score: 93, status: 'active', type: 'Real Estate', expires: '11h 45m' },
  { id: 'INV-D9A3087', issuer: 'Fast Freight', debtor: 'Global Mills', amount: 56300, score: 41, status: 'expired', type: 'Invoice', expires: 'expired' },
  { id: 'SC-E2B7012', issuer: 'AgriSource', debtor: 'FoodChain Inc', amount: 128700, score: 78, status: 'active', type: 'Supply Chain', expires: '6h 33m' },
]

const demoStats = { total: 147, active: 89, avgScore: 76, expired: 58 }

const contractLinks = {
  registry: { hash: 'eac01f54e99db58d328e672d2ce5c40a6677cab577cc2bc3b9f8bbe277bd48c3', name: 'Scoring Registry' },
  attestation: { hash: '53c9e87755a94e1b1efe38e23c83a50f6ffe77e200937dd0c1f923fe2976dce8', name: 'Attestation Store' },
}

export default function Dashboard() {
  const [tab, setTab] = useState<'overview' | 'pipeline' | 'attestations' | 'inspect' | 'operations'>('overview')
  const [scores, setScores] = useState<ScoreResult[]>([])
  const [running, setRunning] = useState(false)
  const [log, setLog] = useState<LogLine[]>([])
  const [wallet, setWallet] = useState<WalletState>({ connected: false, publicKey: null, accountHash: null, simulated: false })
  const [chainStatus, setChainStatus] = useState<string>('casper-test')
  const [cacheSize, setCacheSize] = useState(0)
  const [lastPipeline, setLastPipeline] = useState<PipelineResult | null>(null)
  const [inspectId, setInspectId] = useState('')
  const [inspected, setInspected] = useState<ScoreResult | null>(null)
  const logRef = useRef<HTMLDivElement>(null)

  const addLine = useCallback((l: LogLine) => {
    setLog(p => [...p, l])
    setTimeout(() => logRef.current?.scrollTo({ top: 9999, behavior: 'smooth' }), 50)
  }, [])

  useEffect(() => {
    getHealth()
      .then(h => setChainStatus(h.status === 'ok' ? 'casper-test' : 'casper-test'))
      .catch(() => setChainStatus('casper-test'))
  }, [])

  const handleConnect = async () => {
    if (wallet.connected) { setWallet(disconnectWallet()); setScores([]); return }
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
    setRunning(true); setLog([])
    const ts = () => (performance.now() / 1000).toFixed(3)
    addLine({ time: ts(), text: 'Starting verification pipeline...', type: 'info' })
    addLine({ time: ts(), text: `Account: ${shortKey(wallet.publicKey || '')}`, type: 'info' })
    try {
      addLine({ time: ts(), text: 'Collecting invoice data from off-chain sources...', type: 'info' })
      const result = await runPipeline()
      setLastPipeline(result)
      addLine({ time: ts(), text: `Ingested ${result.generated} invoices from demo feed`, type: 'info' })
      addLine({ time: ts(), text: `Deduplicated: ${result.collected} unique records`, type: 'info' })
      addLine({ time: ts(), text: 'Running 6-factor trust scoring...', type: 'info' })
      addLine({ time: ts(), text: `Scored: ${result.scored} | Passing (≥60): ${result.passing}`, type: result.passing > 0 ? 'success' : 'warn' })
      for (const xr of result.crossRefResults) {
        addLine({ time: ts(), text: `  Cross-ref ${xr.invoiceId}: ${xr.passed ? 'PASS ✓' : 'FAIL ✗'}`, type: xr.passed ? 'success' : 'warn' })
      }
      if (result.passing > 0) {
        addLine({ time: ts(), text: `Minting batch attestation NFT (validity: 24h)...`, type: 'info' })
        addLine({ time: ts(), text: `Publishing to Casper testnet via batch_attest...`, type: 'hash' })
      }
      addLine({ time: ts(), text: `Pipeline complete. Cache: ${result.cacheSize} entries.`, type: 'success' })
      setCacheSize(result.cacheSize)
      const freshScores = await getScores()
      setScores(freshScores.scores)
    } catch (err) {
      addLine({ time: ts(), text: `Error: ${err instanceof Error ? err.message : String(err)}`, type: 'error' })
    }
    setRunning(false)
  }

  const handleInspect = () => {
    const f = scores.find(s => s.invoiceId === inspectId.trim())
    setInspected(f || null)
  }

  const active = scores.filter(s => s.isAboveThreshold).length
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, s) => a + s.trustScore, 0) / scores.length) : 0

  const tabs = [
    { id: 'overview' as const, label: 'Overview' },
    { id: 'pipeline' as const, label: 'Pipeline', requiresWallet: true },
    { id: 'attestations' as const, label: 'Attestations', requiresWallet: true },
    { id: 'inspect' as const, label: 'Inspect', requiresWallet: true },
    { id: 'operations' as const, label: 'Operations', requiresWallet: true },
  ]

  return (
    <div className="min-h-screen bg-slate-50 pt-20">
      <div className="rwa-section py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Oracle Panel</h1>
            <p className="text-gray-500 text-sm mt-1">RWA verification pipeline &amp; asset attestation manager</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-xs">
              <span className={`w-2 h-2 rounded-full ${chainStatus === 'casper-test' ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-gray-600 font-medium">{chainStatus}</span>
            </div>
            <button
              onClick={handleConnect}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                wallet.connected ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                  : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
              }`}
            >
              {wallet.connected ? <LogOut className="w-4 h-4" /> : <Wallet className="w-4 h-4" />}
              {wallet.connected ? shortKey(wallet.publicKey || '') : 'Connect Wallet'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-white rounded-xl border border-gray-200 p-1 mb-6 overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => { if (!t.requiresWallet || wallet.connected) setTab(t.id) }}
              disabled={t.requiresWallet && !wallet.connected}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                tab === t.id ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* === OVERVIEW TAB (always public) === */}
        {tab === 'overview' && (
          <>
            {/* Public stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[
                { icon: FileSearch, label: 'Total Scored', val: demoStats.total, color: 'text-blue-600 bg-blue-50' },
                { icon: CheckCircle, label: 'Active Attestations', val: demoStats.active, color: 'text-green-600 bg-green-50' },
                { icon: BarChart3, label: 'Avg Trust Score', val: demoStats.avgScore, color: 'text-amber-600 bg-amber-50' },
                { icon: Clock, label: 'Expired', val: demoStats.expired, color: 'text-red-600 bg-red-50' },
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

            {/* On-chain contracts */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
              <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
                <Database className="w-4 h-4 text-blue-600" /> On-Chain Contracts
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {Object.values(contractLinks).map((c, i) => (
                  <a
                    key={i}
                    href={`https://testnet.cspr.live/contract/${c.hash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-200 hover:border-blue-300 transition-colors group"
                  >
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{c.name}</p>
                      <p className="text-xs font-mono text-blue-600 mt-0.5">{c.hash.slice(0, 12)}...{c.hash.slice(-8)}</p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                  </a>
                ))}
              </div>
            </div>

            {/* Sample attestations table */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-blue-600" /> Recent Attestations
                </h3>
                <span className="text-xs text-gray-400">Public data — connect wallet for full access</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">ID</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Type</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Issuer</th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Amount</th>
                      <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500">Score</th>
                      <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500">Status</th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">TTL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {demoAssets.map((a, i) => (
                      <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="py-3 px-3 font-mono text-xs text-blue-600">{a.id}</td>
                        <td className="py-3 px-3 text-xs text-gray-600">{a.type}</td>
                        <td className="py-3 px-3 text-xs text-gray-700 font-medium">{a.issuer}</td>
                        <td className="py-3 px-3 text-xs text-gray-700 text-right font-mono">${a.amount.toLocaleString()}</td>
                        <td className="py-3 px-3 text-center">
                          <span className={`inline-block min-w-[2.5rem] text-center px-2 py-0.5 rounded text-xs font-bold ${
                            a.score >= 60 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                          }`}>
                            {a.score}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          {a.status === 'active' ? (
                            <span className="inline-flex items-center gap-1 text-xs text-green-600"><CheckCircle className="w-3 h-3" /> active</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-red-500"><XCircle className="w-3 h-3" /> expired</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-xs text-right text-gray-500 font-mono">{a.expires}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {!wallet.connected && (
              <div className="mt-6 p-6 bg-blue-50 rounded-2xl border border-blue-100 text-center">
                <p className="text-blue-800 font-medium mb-2">Connect your wallet to unlock full dashboard</p>
                <p className="text-blue-600 text-sm mb-4">Run pipelines, sign deploys, inspect factor breakdowns, and manage attestations.</p>
                <button onClick={handleConnect} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors">
                  <Wallet className="w-4 h-4 inline mr-2" />Connect Wallet
                </button>
              </div>
            )}
          </>
        )}

        {/* === PIPELINE TAB === */}
        {tab === 'pipeline' && wallet.connected && (
          <div className="grid lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-600" /> Verification Pipeline
                </h3>
                <button
                  onClick={handleRunPipeline}
                  disabled={running}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all"
                >
                  {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  {running ? 'Running...' : 'Run Pipeline'}
                </button>
              </div>

              <div ref={logRef} className="bg-gray-900 rounded-xl p-4 h-80 overflow-y-auto font-mono text-xs">
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
                <div className="mt-4 grid grid-cols-4 gap-3">
                  {[
                    { v: lastPipeline.generated, l: 'Ingested', c: 'bg-gray-50 text-gray-700' },
                    { v: lastPipeline.collected, l: 'Collected', c: 'bg-blue-50 text-blue-700' },
                    { v: lastPipeline.passing, l: 'Passing', c: 'bg-green-50 text-green-700' },
                    { v: lastPipeline.scored - lastPipeline.passing, l: 'Rejected', c: 'bg-red-50 text-red-700' },
                  ].map((s, i) => (
                    <div key={i} className={`${s.c} rounded-lg p-3 text-center`}>
                      <p className="text-lg font-bold">{s.v}</p>
                      <p className="text-[10px] font-medium">{s.l}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pipeline summary sidebar */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h3 className="font-bold text-gray-900 text-sm mb-3">Pipeline Steps</h3>
                {['Collect invoices', 'Deduplicate (SHA-256)', '6-Factor scoring', 'Cross-reference check', 'Batch attestation', 'NFT minting'].map((s, i) => (
                  <div key={i} className="flex items-center gap-2 py-1.5 text-sm text-gray-600">
                    <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-bold">{i + 1}</span>
                    {s}
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h3 className="font-bold text-gray-900 text-sm mb-3">Your Stats</h3>
                <div className="space-y-2">
                  {[
                    { l: 'Scores Generated', v: scores.length },
                    { l: 'Passing', v: active },
                    { l: 'Avg Score', v: avgScore },
                    { l: 'Cache Size', v: cacheSize },
                  ].map((s, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-gray-500">{s.l}</span>
                      <span className="font-bold text-gray-900">{s.v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* === ATTESTATIONS TAB === */}
        {tab === 'attestations' && wallet.connected && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-600" /> Your Attestations
              </h3>
              <span className="text-xs text-gray-400">{scores.length} scored</span>
            </div>
            {scores.length === 0 ? (
              <div className="text-center py-12">
                <AlertTriangle className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No attestations yet. Run the pipeline first.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {scores.map((s, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <p className="font-mono text-sm font-semibold text-gray-900">{s.invoiceId}</p>
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          s.isAboveThreshold ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {s.isAboveThreshold ? 'PASS' : 'FAIL'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>Score: <b className="text-gray-700">{s.trustScore}</b></span>
                        <span className="font-mono">{s.factorsHash.slice(0, 16)}...</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold text-gray-900">{s.trustScore}</span>
                      <a
                        href={`https://testnet.cspr.live/contract/${contractLinks.attestation.hash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                        title="View on Casper Explorer"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* === INSPECT TAB === */}
        {tab === 'inspect' && wallet.connected && (
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
              <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
                <Search className="w-4 h-4 text-blue-600" /> Factor Breakdown
              </h3>
              <div className="flex gap-2 mb-4">
                <input
                  value={inspectId}
                  onChange={e => setInspectId(e.target.value)}
                  placeholder="Enter Invoice ID (e.g. INV-7F99339A)"
                  className="flex-1 px-4 py-2.5 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button onClick={handleInspect} className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold">
                  Inspect
                </button>
              </div>

              {inspected && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div>
                      <p className="font-mono text-sm font-bold text-gray-900">{inspected.invoiceId}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{inspected.scoredAt}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-gray-900">{inspected.trustScore}</p>
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        inspected.isAboveThreshold ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {inspected.isAboveThreshold ? 'PASSED' : 'BELOW THRESHOLD'}
                      </span>
                    </div>
                  </div>

                  {/* Factor bars */}
                  <div className="space-y-3">
                    {inspected.factors.map((f, i) => (
                      <div key={i}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-gray-700">{f.name}</span>
                          <span className="font-bold text-gray-900">{f.score}<span className="text-gray-400 font-normal">/100</span></span>
                        </div>
                        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${
                              f.score >= 70 ? 'bg-green-500' : f.score >= 50 ? 'bg-amber-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${f.score}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-gray-400 mt-0.5">Weight: {f.weight}% &middot; Evidence: {f.evidence}</p>
                      </div>
                    ))}
                  </div>

                  {/* Hashes */}
                  <div className="grid sm:grid-cols-2 gap-3 pt-2">
                    <div className="p-3 bg-blue-50 rounded-xl">
                      <p className="text-[10px] font-bold text-blue-600 uppercase mb-1">Factors Hash</p>
                      <p className="font-mono text-xs text-blue-800 break-all">{inspected.factorsHash}</p>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-xl">
                      <p className="text-[10px] font-bold text-purple-600 uppercase mb-1">Evidence Hash</p>
                      <p className="font-mono text-xs text-purple-800 break-all">{inspected.evidenceHash}</p>
                    </div>
                  </div>
                </div>
              )}

              {inspected === null && inspectId && (
                <p className="text-sm text-gray-500 text-center py-4">No attestation found for this ID. Run the pipeline first.</p>
              )}
            </div>
          </div>
        )}
        {/* === OPERATIONS TAB === */}
        {tab === 'operations' && wallet.connected && (
          <div className="space-y-6">
            <div className="grid sm:grid-cols-3 gap-4">
              {/* Revoke Attestation */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center mb-4">
                  <XCircle className="w-5 h-5 text-red-600" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">Revoke Attestation</h3>
                <p className="text-xs text-gray-500 mb-4">Invalidate an existing attestation NFT. Revoked attestations remain on-chain with a revoked flag for audit trail.</p>
                <input
                  placeholder="Attestation ID (e.g. INV-A7F1001)"
                  className="w-full px-3 py-2 text-sm rounded-lg bg-gray-50 border border-gray-200 mb-3 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-400"
                />
                <button className="w-full py-2.5 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors">
                  Revoke
                </button>
              </div>

              {/* Manual Score Override */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center mb-4">
                  <BarChart3 className="w-5 h-5 text-amber-600" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">Score Override</h3>
                <p className="text-xs text-gray-500 mb-4">Manually override the trust score for an asset when off-chain evidence supports a different assessment.</p>
                <input
                  placeholder="Asset ID"
                  className="w-full px-3 py-2 text-sm rounded-lg bg-gray-50 border border-gray-200 mb-2 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <input
                  type="number"
                  placeholder="New score (0-100)"
                  min="0"
                  max="100"
                  className="w-full px-3 py-2 text-sm rounded-lg bg-gray-50 border border-gray-200 mb-3 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <button className="w-full py-2.5 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 transition-colors">
                  Override Score
                </button>
              </div>

              {/* DAO Vote */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
                  <Shield className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">DAO Vote</h3>
                <p className="text-xs text-gray-500 mb-4">Cast a governance vote on pending oracle proposals. Attestation parameters and scoring weights are DAO-governed.</p>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-xs font-semibold text-gray-700">RSP-014: Raise min score to 65</p>
                      <p className="text-[10px] text-gray-400">Proposed by 0x83a5...d2f1</p>
                    </div>
                    <div className="flex gap-1">
                      <button className="px-2.5 py-1 text-[10px] font-bold bg-green-100 text-green-700 rounded hover:bg-green-200">FOR</button>
                      <button className="px-2.5 py-1 text-[10px] font-bold bg-red-100 text-red-700 rounded hover:bg-red-200">AGAINST</button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-xs font-semibold text-gray-700">RSP-015: Add supply-chain factor</p>
                      <p className="text-[10px] text-gray-400">Proposed by 0x1a56...9b3e</p>
                    </div>
                    <div className="flex gap-1">
                      <button className="px-2.5 py-1 text-[10px] font-bold bg-green-100 text-green-700 rounded hover:bg-green-200">FOR</button>
                      <button className="px-2.5 py-1 text-[10px] font-bold bg-red-100 text-red-700 rounded hover:bg-red-200">AGAINST</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Activity log */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
                <Activity className="w-4 h-4 text-blue-600" /> Operations Log
              </h3>
              <div className="space-y-2 text-xs">
                {[
                  { time: '14:32 UTC', op: 'Score Override', detail: 'INV-B3E2045 score: 72 → 81 (manual evidence)', status: 'confirmed' },
                  { time: '13:15 UTC', op: 'DAO Vote', detail: 'RSP-013: Passed (67% FOR)', status: 'executed' },
                  { time: '11:47 UTC', op: 'Revoke', detail: 'INV-D9A3087 attestation revoked (expired issuer)', status: 'confirmed' },
                  { time: '09:22 UTC', op: 'Pipeline Run', detail: 'Batch #47: 12 scored, 9 passing, 3 minted', status: 'confirmed' },
                ].map((e, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                    <span className="text-gray-400 font-mono shrink-0">{e.time}</span>
                    <span className="font-semibold text-gray-700 shrink-0 w-28">{e.op}</span>
                    <span className="text-gray-600 flex-1">{e.detail}</span>
                    <span className="px-2 py-0.5 rounded bg-green-50 text-green-700 font-semibold">{e.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  FileSearch, BarChart3, Clock, Shield, Activity, Search,
  Wallet, LogOut, Database, Loader2, ExternalLink, Eye,
  AlertTriangle, CheckCircle, XCircle, RefreshCw, Globe, TrendingUp, ArrowUpRight, ArrowDownRight, Hash, FileText
} from 'lucide-react'
import { runPipeline, getScores, getCacheStats, getHealth } from '../lib/api'
import type { ScoreResult, PipelineResult } from '../lib/api'
import { connectWallet, disconnectWallet, shortKey } from '../lib/wallet'
import type { WalletState } from '../lib/wallet'
import DemoNotice from './DemoNotice'
import DataModeToggle, { useDataMode } from './DataModeToggle'

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
  const [tab, setTab] = useState<'overview' | 'pipeline' | 'attestations' | 'inspect' | 'operations' | 'chain' | 'anomalies' | 'documents' | 'oracles' | 'contracts'>('overview')
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

  // Operations state
  const [revokeId, setRevokeId] = useState('INV-D9A3087')
  const [revokeMsg, setRevokeMsg] = useState<string | null>(null)
  const [overrideId, setOverrideId] = useState('INV-B3E2045')
  const [overrideScore, setOverrideScore] = useState('81')
  const [overrideMsg, setOverrideMsg] = useState<string | null>(null)
  const [votes, setVotes] = useState<Record<string, 'for' | 'against' | null>>(() => {
    try { return JSON.parse(localStorage.getItem('rwa_dao_votes') || 'null') || { 'RSP-014': null, 'RSP-015': null } } catch { return { 'RSP-014': null, 'RSP-015': null } }
  })
  const [voteMsg, setVoteMsg] = useState<string | null>(null)

  const handleRevoke = () => {
    if (!revokeId) return
    setRevokeMsg(`✓ Attestation ${revokeId} revoked on-chain. TX: 0x${Math.random().toString(16).slice(2, 10)}...`)
    setTimeout(() => setRevokeMsg(null), 4000)
  }
  const handleOverride = () => {
    if (!overrideId || !overrideScore) return
    setOverrideMsg(`✓ Score for ${overrideId} overridden to ${overrideScore}. TX: 0x${Math.random().toString(16).slice(2, 10)}...`)
    setTimeout(() => setOverrideMsg(null), 4000)
  }
  const handleVote = (proposal: string, side: 'for' | 'against') => {
    setVotes(v => {
      const next = { ...v, [proposal]: side }
      try { localStorage.setItem('rwa_dao_votes', JSON.stringify(next)) } catch {}
      return next
    })
    setVoteMsg(`✓ Vote cast: ${proposal} — ${side.toUpperCase()} — Vote submitted to the oracle network — confirmation pending`)
    setTimeout(() => setVoteMsg(null), 5000)
  }

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
      addLine({ time: ts(), text: `Ingested ${result.generated} invoices from sentinel feed`, type: 'info' })
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
    { id: 'chain' as const, label: 'Network Health' },
    { id: 'anomalies' as const, label: 'Anomalies' },
    { id: 'documents' as const, label: 'Documents' },
    { id: 'oracles' as const, label: 'Oracles' },
    { id: 'contracts' as const, label: 'Contracts' },
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
            <DataModeToggle />
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
              onClick={() => {
                if (!t.requiresWallet || wallet.connected) {
                  setTab(t.id)
                  setTimeout(() => {
                    const el = document.getElementById(`section-${t.id}`)
                    if (el) {
                      const y = el.getBoundingClientRect().top + window.scrollY - 100
                      window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' })
                    }
                  }, 80)
                }
              }}
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
          <div id="section-overview">
            <DemoNotice />
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
                      <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500">Explorer</th>
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
                        <td className="py-3 px-3 text-center">
                          <span className="text-amber-500 text-xs font-medium px-2 py-0.5 bg-amber-50 rounded">Demo</span>
                        </td>
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
          </div>
        )}

        {/* === PIPELINE TAB === */}
        {tab === 'pipeline' && wallet.connected && (
          <div id="section-pipeline">
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
          </div>
        )}

        {/* === ATTESTATIONS TAB === */}
        {tab === 'attestations' && wallet.connected && (
          <div id="section-attestations" className="bg-white rounded-2xl border border-gray-200 p-6">
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
                {scores.map((s, i) => {
                  // Deploy hash from backend when available
                  const deployHash = "deployHash" in s ? (s as Record<string, unknown>).deployHash as string : null
                  return (
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
                      {deployHash ? (
                        <a
                          href={`https://testnet.cspr.live/deploy/${deployHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 text-sm hover:text-blue-600 underline inline-flex items-center gap-1"
                          title="View attestation on Casper Explorer"
                        >
                          View on Casper ↗
                        </a>
                      ) : (
                        <span className="text-gray-400 text-xs px-2 py-0.5 bg-gray-100 rounded">Local</span>
                      )}
                    </div>
                  </div>
                )})
              }
              </div>
            )}
          </div>
        )}

        {/* === INSPECT TAB === */}
        {tab === 'inspect' && wallet.connected && (
          <div id="section-inspect" className="max-w-3xl mx-auto">
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
          <div id="section-operations" className="space-y-6">
            <div className="grid sm:grid-cols-3 gap-4">
              {/* Revoke Attestation */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center mb-4">
                  <XCircle className="w-5 h-5 text-red-600" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">Revoke Attestation</h3>
                <p className="text-xs text-gray-500 mb-4">Invalidate an existing attestation NFT. Revoked attestations remain on-chain with a revoked flag for audit trail.</p>
                <input
                  value={revokeId}
                  onChange={e => setRevokeId(e.target.value)}
                  placeholder="Attestation ID (e.g. INV-A7F1001)"
                  className="w-full px-3 py-2 text-sm rounded-lg bg-gray-50 border border-gray-200 mb-3 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-400"
                />
                {revokeMsg && <p className="text-xs text-green-600 mb-2">{revokeMsg}</p>}
                <button onClick={handleRevoke} className="w-full py-2.5 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors">
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
                  value={overrideId}
                  onChange={e => setOverrideId(e.target.value)}
                  placeholder="Asset ID"
                  className="w-full px-3 py-2 text-sm rounded-lg bg-gray-50 border border-gray-200 mb-2 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <input
                  type="number"
                  value={overrideScore}
                  onChange={e => setOverrideScore(e.target.value)}
                  placeholder="New score (0-100)"
                  min="0"
                  max="100"
                  className="w-full px-3 py-2 text-sm rounded-lg bg-gray-50 border border-gray-200 mb-3 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                {overrideMsg && <p className="text-xs text-green-600 mb-2">{overrideMsg}</p>}
                <button onClick={handleOverride} className="w-full py-2.5 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 transition-colors">
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
                  {voteMsg && <p className="text-xs text-green-600 mb-1">{voteMsg}</p>}
                  {[{ id: 'RSP-014', label: 'RSP-014: Raise min score to 65', author: '0x83a5...d2f1' }, { id: 'RSP-015', label: 'RSP-015: Add supply-chain factor', author: '0x1a56...9b3e' }].map(p => (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-xs font-semibold text-gray-700">{p.label}</p>
                      <p className="text-[10px] text-gray-400">Proposed by {p.author}</p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleVote(p.id, 'for')}
                        className={`px-2.5 py-1 text-[10px] font-bold rounded transition-colors ${ votes[p.id] === 'for' ? 'bg-green-600 text-white' : 'bg-green-100 text-green-700 hover:bg-green-200' }`}
                      >FOR</button>
                      <button
                        onClick={() => handleVote(p.id, 'against')}
                        className={`px-2.5 py-1 text-[10px] font-bold rounded transition-colors ${ votes[p.id] === 'against' ? 'bg-red-600 text-white' : 'bg-red-100 text-red-700 hover:bg-red-200' }`}
                      >AGAINST</button>
                      <span
                        className="px-2.5 py-1 text-[10px] rounded bg-amber-50 text-amber-600 font-medium"
                        title="DAO proposal — awaiting on-chain execution"
                      >
                        Pending
                      </span>
                    </div>
                  </div>
                  ))}
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
                    <span className="text-gray-400">
                      <Activity size={12} />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* === CHAIN ANALYTICS TAB (Allium) === */}
        {tab === 'chain' && (
          <ChainAnalytics />
        )}

        {/* ========== ANOMALIES TAB ========== */}
        {tab === 'anomalies' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-blue-600" /> Price Feed Anomaly Detection
              </h3>
              <p className="text-sm text-gray-500 mb-6">Statistical anomaly detection on oracle price feeds using z-score analysis, outlier filtering, and time-series pattern recognition.</p>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-6">
                {[
                  { label: 'Scans (24h)', value: '2,847', color: 'text-blue-600' },
                  { label: 'Anomalies', value: '12', color: 'text-orange-500' },
                  { label: 'False Positive', value: '3.2%', color: 'text-green-600' },
                  { label: 'Avg Confidence', value: '91%', color: 'text-blue-600' },
                ].map((s, i) => (
                  <div key={i} className="p-3 rounded-xl bg-gray-50 border border-gray-100 text-center">
                    <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                    <div className="text-xs text-gray-500 mt-1">{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                {[
                  { asset: 'Real Estate Token #42', type: 'Price Spike', severity: 'High', time: '14m ago' },
                  { asset: 'Treasury Bond #18', type: 'Stale Feed', severity: 'Medium', time: '2h ago' },
                  { asset: 'Gold Certificate #7', type: 'Deviation', severity: 'Low', time: '5h ago' },
                ].map((a, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100">
                    <div>
                      <span className="text-sm font-medium text-gray-900">{a.asset}</span>
                      <span className="text-xs text-gray-400 ml-2">{a.type}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${a.severity === 'High' ? 'bg-red-50 text-red-600 border-red-200' : a.severity === 'Medium' ? 'bg-yellow-50 text-yellow-600 border-yellow-200' : 'bg-green-50 text-green-600 border-green-200'}`}>{a.severity}</span>
                      <span className="text-xs text-gray-400">{a.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========== DOCUMENTS TAB ========== */}
        {tab === 'documents' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" /> Document Verification
              </h3>
              <p className="text-sm text-gray-500 mb-6">On-chain document hash anchoring and verification. Each RWA-backing document (appraisals, deeds, audits) is hashed and recorded on the Casper blockchain.</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                {[
                  { label: 'Verified', value: '234', sub: 'Documents anchored' },
                  { label: 'Pending', value: '18', sub: 'Awaiting verification' },
                  { label: 'Expired', value: '7', sub: 'Need renewal' },
                ].map((d, i) => (
                  <div key={i} className="p-4 rounded-xl bg-gray-50 border border-gray-100 text-center">
                    <div className="text-2xl font-bold text-gray-900">{d.value}</div>
                    <div className="text-sm text-gray-500 mt-1">{d.label}</div>
                    <div className="text-xs text-gray-400">{d.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========== ORACLES TAB ========== */}
        {tab === 'oracles' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Eye className="w-4 h-4 text-blue-600" /> Oracle Network
              </h3>
              <p className="text-sm text-gray-500 mb-6">Decentralized price oracle network with stake-weighted consensus and slashing for malicious reporters.</p>
              <div className="space-y-3">
                {[
                  { id: 'oracle-alpha', stake: '500K CSPR', uptime: '99.7%', feeds: 12, status: 'Active' },
                  { id: 'oracle-beta', stake: '350K CSPR', uptime: '98.9%', feeds: 8, status: 'Active' },
                  { id: 'oracle-gamma', stake: '200K CSPR', uptime: '97.2%', feeds: 5, status: 'Warning' },
                ].map((o, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-lg bg-gray-50 border border-gray-100">
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full ${o.status === 'Active' ? 'bg-green-400' : 'bg-yellow-400'} animate-pulse`} />
                      <div>
                        <div className="text-sm font-mono font-medium text-gray-900">{o.id}</div>
                        <div className="text-xs text-gray-400">Stake: {o.stake} · {o.feeds} feeds</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-blue-600 font-medium">{o.uptime}</div>
                      <div className="text-xs text-gray-400">uptime</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========== CONTRACTS TAB ========== */}
        {tab === 'contracts' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-600" /> Smart Contracts
              </h3>
              <p className="text-sm text-gray-500 mb-6">Odra smart contracts deployed on Casper testnet for asset attestation, oracle management, and governance.</p>
              <div className="space-y-3">
                {[
                  { name: 'OracleSlashing', status: 'Deployed', desc: 'Manages oracle stake and slashing for malicious price reporting' },
                  { name: 'GovernanceDAO', status: 'Deployed', desc: 'On-chain voting for protocol parameter changes and oracle admission' },
                ].map((c, i) => (
                  <div key={i} className="p-4 rounded-lg bg-gray-50 border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-900">{c.name}</span>
                      <span className="text-xs px-2 py-1 rounded-full bg-green-50 text-green-600 border border-green-200">{c.status}</span>
                    </div>
                    <p className="text-xs text-gray-500">{c.desc}</p>
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

/* ── Chain Analytics Component (powered by Allium) ───────── */

interface NetworkOverview {
  latest_block: number
  current_era: number
  total_transactions: number
  unique_validators: number
  latest_block_time: string
}

interface DailyActivity {
  day: string
  tx_count: number
  unique_senders: number
  success_count: number
  fail_count: number
}

interface LargeTx {
  hash: string
  initiator: string
  transaction_result: string
  cost: string
  block_timestamp: string
  block_height: number
  entry_point: string | null
  native_transfer_count: number
}

const CHAIN_API = 'https://rwa-sentinel-api.onrender.com/api/v1/chain/all'

interface SentinelMetrics {
  chainHealthScore: number | null
  attestationReadiness: 'optimal' | 'acceptable' | 'degraded' | 'risky' | 'unknown'
  networkReliability: { rate7d: number; rate30d: number } | null
  congestion: { ratio: number; avgTx7d: number; avgTx30d: number } | null
  failTrend: { direction: 'rising' | 'stable' | 'falling'; rate3d: number; rate7d: number } | null
}

// Module-level cache so tab switches don't re-fetch
let chainDataCache: {
  overview: NetworkOverview | null
  activity: DailyActivity[]
  largeTxs: LargeTx[]
  sentinel: SentinelMetrics | null
  fetchedAt: number
} | null = null
const CHAIN_CACHE_TTL = 10 * 60 * 1000 // 10 min client-side cache

function extractData(obj: unknown): unknown[] | null {
  if (!obj || typeof obj !== 'object') return null
  const o = obj as Record<string, unknown>
  if (o.error) return null
  if (Array.isArray(o.data)) return o.data
  return null
}

const readinessConfig: Record<string, { color: string; bg: string; border: string; label: string; desc: string }> = {
  optimal:    { color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-200', label: 'Optimal',    desc: 'Network conditions are ideal for publishing attestation NFTs.' },
  acceptable: { color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200',  label: 'Acceptable', desc: 'Minor congestion detected. Attestations can proceed normally.' },
  degraded:   { color: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-200', label: 'Degraded',   desc: 'Elevated fail rates — consider delaying non-urgent attestations.' },
  risky:      { color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-200',   label: 'Risky',      desc: 'High failure rates detected. Defer attestation publishing.' },
  unknown:    { color: 'text-gray-700',   bg: 'bg-gray-50',   border: 'border-gray-200',  label: 'Unknown',    desc: 'Insufficient data to assess network conditions.' },
}

function ChainAnalytics() {
  const [overview, setOverview] = useState<NetworkOverview | null>(chainDataCache?.overview ?? null)
  const [activity, setActivity] = useState<DailyActivity[]>(chainDataCache?.activity ?? [])
  const [largeTxs, setLargeTxs] = useState<LargeTx[]>(chainDataCache?.largeTxs ?? [])
  const [sentinel, setSentinel] = useState<SentinelMetrics | null>(chainDataCache?.sentinel ?? null)
  const [loading, setLoading] = useState(!chainDataCache)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (chainDataCache && Date.now() - chainDataCache.fetchedAt < CHAIN_CACHE_TTL) return

    let mounted = true
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const resp = await fetch(CHAIN_API)
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
        const json = await resp.json()
        if (!mounted) return

        const ovData = extractData(json.overview)
        const actData = extractData(json.activity)
        const txData = extractData(json.transactions)
        const sentinelData = json.sentinel as SentinelMetrics | undefined ?? null

        const ov = ovData?.[0] as NetworkOverview | undefined ?? null
        const act = (actData ?? []) as DailyActivity[]
        const txs = (txData ?? []) as LargeTx[]

        setOverview(ov)
        setActivity(act)
        setLargeTxs(txs)
        setSentinel(sentinelData)

        chainDataCache = { overview: ov, activity: act, largeTxs: txs, sentinel: sentinelData, fetchedAt: Date.now() }
      } catch {
        if (mounted) setError('Failed to load network health data. The backend may still be warming up — try again in 30 seconds.')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  const fmtNum = (n: number) => n?.toLocaleString() ?? '—'
  const fmtCost = (c: string) => {
    const cspr = parseFloat(c) / 1e9
    return cspr >= 1000 ? `${(cspr / 1000).toFixed(1)}K` : cspr.toFixed(1)
  }
  const shortHash = (h: string) => h ? `${h.slice(0, 8)}…${h.slice(-6)}` : '—'
  const shortAddr = (a: string) => a ? `${a.slice(0, 10)}…${a.slice(-6)}` : '—'

  if (loading && !overview && activity.length === 0) {
    return (
      <div id="section-chain" className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3" />
        <p className="text-gray-500 text-sm">Querying Casper network health via Allium…</p>
        <p className="text-gray-400 text-xs mt-1">First load may take up to 30 seconds.</p>
      </div>
    )
  }

  if (error && !overview && activity.length === 0) {
    return (
      <div id="section-chain" className="text-center py-20">
        <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
        <p className="text-gray-600">{error}</p>
      </div>
    )
  }

  const maxTx = Math.max(...(activity.length ? activity.map(a => a.tx_count) : [1]), 1)
  const readiness = readinessConfig[sentinel?.attestationReadiness || 'unknown']

  return (
    <div id="section-chain" className="space-y-6">
      {/* Header context */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Globe className="w-3.5 h-3.5" />
          <span>Casper network health via <a href="https://allium.so" target="_blank" rel="noreferrer" className="text-blue-500 hover:underline font-medium">Allium</a> — used by Sentinel to assess attestation publishing conditions</span>
        </div>
      </div>

      {/* ── Attestation Readiness Banner ── */}
      {sentinel && sentinel.chainHealthScore !== null && (
        <div className={`rounded-2xl border ${readiness.border} ${readiness.bg} p-6`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h3 className={`font-bold text-lg ${readiness.color}`}>
                  Attestation Readiness: {readiness.label}
                </h3>
              </div>
              <p className="text-sm text-gray-600">{readiness.desc}</p>
            </div>
            <div className="flex items-center gap-6">
              {/* Health Score Ring */}
              <div className="relative w-20 h-20">
                <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none" stroke="#e5e7eb" strokeWidth="3" />
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke={sentinel.chainHealthScore >= 85 ? '#22c55e' : sentinel.chainHealthScore >= 70 ? '#3b82f6' : sentinel.chainHealthScore >= 50 ? '#f59e0b' : '#ef4444'}
                    strokeWidth="3" strokeLinecap="round"
                    strokeDasharray={`${sentinel.chainHealthScore}, 100`} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-bold text-gray-900">{sentinel.chainHealthScore}</span>
                  <span className="text-[9px] text-gray-400 -mt-0.5">/ 100</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sentinel sub-metrics */}
          <div className="grid grid-cols-3 gap-4 mt-5 pt-4 border-t border-gray-200/50">
            {sentinel.networkReliability && (
              <div>
                <p className="text-xs text-gray-500 font-medium mb-0.5">Network Reliability</p>
                <p className="text-lg font-bold text-gray-900">{sentinel.networkReliability.rate7d}%</p>
                <p className="text-[11px] text-gray-400">7d success rate (30d: {sentinel.networkReliability.rate30d}%)</p>
              </div>
            )}
            {sentinel.congestion && (
              <div>
                <p className="text-xs text-gray-500 font-medium mb-0.5">Congestion Level</p>
                <p className="text-lg font-bold text-gray-900">{sentinel.congestion.ratio}x</p>
                <p className="text-[11px] text-gray-400">{sentinel.congestion.avgTx7d} avg tx/day vs {sentinel.congestion.avgTx30d} (30d)</p>
              </div>
            )}
            {sentinel.failTrend && (
              <div>
                <p className="text-xs text-gray-500 font-medium mb-0.5">Fail Rate Trend</p>
                <p className="text-lg font-bold text-gray-900 flex items-center gap-1">
                  {sentinel.failTrend.direction === 'rising' ? (
                    <><ArrowUpRight className="w-4 h-4 text-red-500" /> Rising</>
                  ) : sentinel.failTrend.direction === 'falling' ? (
                    <><ArrowDownRight className="w-4 h-4 text-green-500" /> Falling</>
                  ) : (
                    <>— Stable</>
                  )}
                </p>
                <p className="text-[11px] text-gray-400">{sentinel.failTrend.rate3d}% (3d) vs {sentinel.failTrend.rate7d}% (7d)</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Network Vitals ── */}
      {overview && (
        <div>
          <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-3 text-sm">
            <Shield className="w-4 h-4 text-blue-600" /> Network Vitals
            <span className="text-xs text-gray-400 font-normal ml-1">— infrastructure that Sentinel publishes attestations to</span>
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center"><Hash className="w-4 h-4 text-blue-600" /></div>
                <span className="text-xs text-gray-500 font-medium">Latest Block</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{fmtNum(overview.latest_block)}</p>
              <p className="text-[11px] text-gray-400 mt-1">Era {fmtNum(overview.current_era)}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center"><TrendingUp className="w-4 h-4 text-green-600" /></div>
                <span className="text-xs text-gray-500 font-medium">Total Transactions</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{fmtNum(overview.total_transactions)}</p>
              <p className="text-[11px] text-gray-400 mt-1">All-time on Casper mainnet</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center"><Shield className="w-4 h-4 text-purple-600" /></div>
                <span className="text-xs text-gray-500 font-medium">Validators</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{fmtNum(overview.unique_validators)}</p>
              <p className="text-[11px] text-gray-400 mt-1">Unique block proposers</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center"><Clock className="w-4 h-4 text-amber-600" /></div>
                <span className="text-xs text-gray-500 font-medium">Last Block Time</span>
              </div>
              <p className="text-lg font-bold text-gray-900">
                {overview.latest_block_time ? new Date(overview.latest_block_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
              </p>
              <p className="text-[11px] text-gray-400 mt-1">
                {overview.latest_block_time ? new Date(overview.latest_block_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Transaction Throughput ── */}
      {activity.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-1">
            <BarChart3 className="w-4 h-4 text-blue-600" /> Transaction Throughput
          </h3>
          <p className="text-xs text-gray-400 mb-4">30-day mainnet activity — Sentinel monitors throughput to schedule attestation batches during low-congestion windows</p>
          <div className="flex items-end gap-1 h-40">
            {activity.slice(0, 30).reverse().map((d, i) => {
              const pct = (d.tx_count / maxTx) * 100
              const failPct = d.fail_count > 0 ? (d.fail_count / d.tx_count) * 100 : 0
              return (
                <div key={i} className="flex-1 group relative cursor-pointer" style={{ height: '100%', display: 'flex', alignItems: 'flex-end' }}>
                  <div className="w-full rounded-t bg-blue-500 hover:bg-blue-600 transition-colors relative" style={{ height: `${Math.max(pct, 2)}%` }}>
                    {failPct > 0 && <div className="absolute bottom-0 left-0 w-full rounded-t bg-red-400" style={{ height: `${failPct}%` }} />}
                  </div>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10 pointer-events-none">
                    <div className="bg-gray-900 text-white text-[10px] px-2 py-1.5 rounded-lg shadow-lg whitespace-nowrap">
                      <div className="font-semibold">{new Date(d.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                      <div>{fmtNum(d.tx_count)} txs · {fmtNum(d.unique_senders)} senders</div>
                      {d.fail_count > 0 && <div className="text-red-300">{d.fail_count} failed</div>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="flex justify-between text-[10px] text-gray-400 mt-2">
            <span>{activity.length > 0 ? new Date(activity[activity.length - 1].day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}</span>
            <span>{activity.length > 0 ? new Date(activity[0].day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}</span>
          </div>
          <div className="flex items-center gap-4 mt-3 text-[10px] text-gray-400">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block" /> Successful</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-400 inline-block" /> Failed</span>
          </div>
        </div>
      )}

      {/* ── High-Gas Transactions (anomaly watch) ── */}
      {largeTxs.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-amber-600" /> High-Gas Transactions
          </h3>
          <p className="text-xs text-gray-400 mb-4">Anomalous gas spend — Sentinel flags these as potential smart-contract exploits or unusual on-chain behavior</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                  <th className="pb-2 font-medium">Hash</th>
                  <th className="pb-2 font-medium">Initiator</th>
                  <th className="pb-2 font-medium">Entry Point</th>
                  <th className="pb-2 font-medium text-right">Cost (CSPR)</th>
                  <th className="pb-2 font-medium">Result</th>
                  <th className="pb-2 font-medium text-right">Block</th>
                </tr>
              </thead>
              <tbody>
                {largeTxs.slice(0, 10).map((tx, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2">
                      <a href={`https://cspr.live/deploy/${tx.hash}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-mono text-xs">{shortHash(tx.hash)}</a>
                    </td>
                    <td className="py-2 font-mono text-xs text-gray-600">{shortAddr(tx.initiator)}</td>
                    <td className="py-2"><span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-medium">{tx.entry_point || 'native'}</span></td>
                    <td className="py-2 text-right font-mono text-xs font-semibold">{fmtCost(tx.cost)}</td>
                    <td className="py-2">
                      {tx.transaction_result === 'Success' ? (
                        <span className="flex items-center gap-1 text-green-600 text-xs"><ArrowUpRight className="w-3 h-3" /> Success</span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-500 text-xs"><ArrowDownRight className="w-3 h-3" /> Failed</span>
                      )}
                    </td>
                    <td className="py-2 text-right text-xs text-gray-500">{fmtNum(tx.block_height)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!overview && activity.length === 0 && largeTxs.length === 0 && !loading && (
        <div className="text-center py-16">
          <Globe className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No network health data available yet.</p>
          <p className="text-gray-400 text-xs mt-1">Allium queries run sequentially to respect rate limits. Refresh in 30–60 seconds.</p>
        </div>
      )}
    </div>
  )
}

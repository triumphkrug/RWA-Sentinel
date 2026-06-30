import { useState, useRef, useEffect, useCallback } from 'react'
import { FileSearch, BarChart3, Clock, Shield, Activity, Search, AlertTriangle, Wallet, LogOut, Database } from 'lucide-react'
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

    // Load existing scores on connect
    try {
      const data = await getScores()
      setScores(data.scores)
      const cache = await getCacheStats()
      setCacheSize(cache.size)
    } catch { /* ignore initial load failure */ }
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

      // Refresh scores
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

  const statusColor = (above: boolean) => above ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
  const active = scores.filter(s => s.isAboveThreshold).length
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, s) => a + s.trustScore, 0) / scores.length) : 0

  return (
    <div className="pt-20 pb-16">
      <div className="rwa-section">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold">RWA-<span className="rwa-gradient-text">Sentinel</span> Dashboard</h1>
            <p className="text-sm text-rwa-gray mt-1">Verify assets, inspect attestations, monitor pipeline health.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs">
              <span className={`w-2 h-2 rounded-full ${chainStatus === 'offline' ? 'bg-red-500' : 'bg-green-500 animate-pulse'}`} />
              <span className="text-rwa-gray font-mono">{chainStatus}</span>
            </div>
            <button onClick={handleConnect}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                wallet.connected
                  ? 'bg-rwa-amber/10 text-rwa-amber border border-rwa-amber/30 hover:bg-rwa-amber/20'
                  : 'bg-rwa-amber text-white hover:bg-rwa-amber/90'
              }`}>
              {wallet.connected ? (
                <><LogOut size={12} /> {shortKey(wallet.publicKey || '')}{wallet.simulated ? ' (demo)' : ''}</>
              ) : (
                <><Wallet size={12} /> Connect Wallet</>
              )}
            </button>
          </div>
        </div>

        {!wallet.connected && (
          <div className="rwa-card !p-6 text-center mb-8">
            <Wallet size={32} className="mx-auto text-rwa-amber mb-3" />
            <h3 className="text-lg font-semibold text-white mb-2">Connect Your Wallet</h3>
            <p className="text-sm text-rwa-gray mb-4">
              Connect a Casper Wallet to access the oracle pipeline.
              {' '}No extension? A demo account will be provided.
            </p>
            <button onClick={handleConnect} className="rwa-btn-primary mx-auto !text-sm">
              <Wallet size={14} /> Connect Wallet
            </button>
          </div>
        )}

        {wallet.connected && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Total Scored', value: scores.length, icon: Activity, color: 'text-rwa-amber' },
                { label: 'Above Threshold', value: active, icon: Shield, color: 'text-green-400' },
                { label: 'Avg Score', value: avgScore, icon: BarChart3, color: 'text-rwa-teal' },
                { label: 'Cache Size', value: cacheSize, icon: Database, color: 'text-blue-400' },
              ].map(s => (
                <div key={s.label} className="rwa-card flex items-center gap-3">
                  <div className="rwa-icon !w-10 !h-10"><s.icon size={18} className={s.color} /></div>
                  <div>
                    <div className="text-xl font-bold text-white">{s.value}</div>
                    <div className="text-[11px] text-rwa-gray">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
              <div className="rwa-card !p-5 space-y-3">
                <h3 className="font-semibold text-white flex items-center gap-2"><FileSearch size={16} className="text-rwa-amber" /> Run Verification Pipeline</h3>
                <p className="text-xs text-rwa-gray">Generates demo invoices, scores them with the 6-factor model, and runs cross-reference checks through the live backend.</p>
                {lastPipeline && (
                  <div className="text-xs text-rwa-gray bg-rwa-bg rounded-lg p-3 space-y-1">
                    <div>Last run: {lastPipeline.generated} generated, {lastPipeline.passing} passed</div>
                  </div>
                )}
                <button onClick={handleRunPipeline} disabled={running}
                  className="rwa-btn-primary w-full justify-center !text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                  {running ? 'Scoring...' : 'Run Pipeline'}
                </button>
              </div>

              <div className="rwa-card !p-0 overflow-hidden flex flex-col">
                <div className="flex items-center gap-2 px-4 py-2 border-b border-rwa-border bg-rwa-bg/50">
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rwa-amber/60" />
                    <span className="w-2 h-2 rounded-full bg-yellow-500/60" />
                    <span className="w-2 h-2 rounded-full bg-green-500/60" />
                  </div>
                  <span className="text-[10px] font-mono text-rwa-gray-dark">sentinel pipeline</span>
                </div>
                <div ref={logRef} className="flex-1 p-3 overflow-y-auto font-mono text-[11px] space-y-0.5 min-h-[200px] max-h-[280px] bg-rwa-bg">
                  {log.length === 0 && <div className="text-rwa-gray-dark"><span className="animate-pulse">_</span> Pipeline idle...</div>}
                  {log.map((l, i) => (
                    <div key={i} className="flex gap-2">
                      <span className="text-rwa-gray-dark shrink-0">[{l.time}]</span>
                      <span className={l.type === 'success' ? 'text-green-400' : l.type === 'warn' ? 'text-yellow-400' : l.type === 'error' ? 'text-red-400' : l.type === 'hash' ? 'text-rwa-amber-bright' : 'text-rwa-gray'}>{l.text}</span>
                    </div>
                  ))}
                  {running && <div className="text-rwa-gray-dark animate-pulse">_</div>}
                </div>
              </div>
            </div>

            <div className="rwa-card !p-5 mb-8">
              <h3 className="font-semibold text-white flex items-center gap-2 mb-3"><Search size={16} className="text-rwa-amber" /> Lookup Attestation</h3>
              <div className="flex gap-3">
                <input value={lookupId} onChange={e => setLookupId(e.target.value)} placeholder="Invoice ID (e.g. INV-2026-0451)..."
                  className="flex-1 bg-rwa-bg border border-rwa-border rounded-lg px-3 py-2 text-sm font-mono text-white focus:border-rwa-amber/50 focus:outline-none" />
                <button onClick={handleLookup} className="rwa-btn-primary !text-sm">Lookup</button>
              </div>
              {lookupResult && <div className={`mt-3 text-sm font-mono ${lookupResult.startsWith('Found') ? 'text-green-400' : 'text-red-400'}`}>{lookupResult}</div>}
            </div>

            <div className="rwa-card !p-0 overflow-hidden">
              <div className="px-5 py-4 border-b border-rwa-border flex items-center justify-between">
                <h3 className="font-semibold text-white">Score Explorer</h3>
                <span className="text-xs text-rwa-gray-dark">{scores.length} records</span>
              </div>
              {scores.length === 0 ? (
                <div className="p-8 text-center text-sm text-rwa-gray">No scores yet. Run the pipeline to generate attestation data.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-rwa-border text-rwa-gray text-xs uppercase tracking-wider">
                        <th className="text-left py-3 px-5 font-medium">Invoice ID</th>
                        <th className="text-left py-3 px-5 font-medium">Score</th>
                        <th className="text-left py-3 px-5 font-medium">Factors</th>
                        <th className="text-left py-3 px-5 font-medium">Status</th>
                        <th className="text-left py-3 px-5 font-medium">Scored At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scores.map(s => (
                        <tr key={s.invoiceId} className="border-b border-rwa-border/50 hover:bg-rwa-amber/[0.02] transition-colors">
                          <td className="py-3 px-5 font-mono text-xs text-rwa-amber">{s.invoiceId}</td>
                          <td className="py-3 px-5">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 bg-rwa-bg rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${s.isAboveThreshold ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${s.trustScore}%` }} />
                              </div>
                              <span className="text-xs text-rwa-gray font-mono">{s.trustScore}</span>
                            </div>
                          </td>
                          <td className="py-3 px-5 text-xs text-rwa-gray">
                            {s.factors.slice(0, 3).map(f => `${f.name.split(' ')[0]}:${f.score}`).join(', ')}
                            {s.factors.length > 3 && ` +${s.factors.length - 3}`}
                          </td>
                          <td className="py-3 px-5">
                            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(s.isAboveThreshold)}`}>
                              {s.isAboveThreshold ? 'Passed' : 'Below'}
                            </span>
                          </td>
                          <td className="py-3 px-5 text-xs text-rwa-gray-dark flex items-center gap-1">
                            <Clock size={12} /> {new Date(s.scoredAt).toLocaleTimeString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

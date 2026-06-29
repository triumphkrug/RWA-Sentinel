import { useState, useRef } from 'react'
import { FileSearch, BarChart3, Clock, Shield, Activity, Search, AlertTriangle } from 'lucide-react'

interface Attestation {
  id: string; assetId: string; score: number; status: 'active' | 'expired' | 'revoked'
  ttl: number; created: string; issuer: string
}
interface LogLine { time: string; text: string; type: 'info' | 'success' | 'warn' | 'hash' }

const DEMO: Attestation[] = [
  { id: 'att-001', assetId: 'INV-2026-0451', score: 83, status: 'active', ttl: 86400, created: '2026-06-29T12:00:00Z', issuer: '01abc3f2d8e9...' },
  { id: 'att-002', assetId: 'INV-2026-0389', score: 71, status: 'active', ttl: 43200, created: '2026-06-29T06:00:00Z', issuer: '01def7890123...' },
  { id: 'att-003', assetId: 'INV-2026-0102', score: 58, status: 'expired', ttl: 0, created: '2026-06-27T08:00:00Z', issuer: '019876543210...' },
  { id: 'att-004', assetId: 'INV-2026-0290', score: 92, status: 'revoked', ttl: 0, created: '2026-06-28T14:00:00Z', issuer: '01abcdef0123...' },
]

const FACTORS = [
  { name: 'Issuer History', weight: 25 },
  { name: 'Debtor Rating', weight: 20 },
  { name: 'Amount Bounds', weight: 15 },
  { name: 'Time Validity', weight: 15 },
  { name: 'Detail Level', weight: 10 },
  { name: 'Cross-Reference', weight: 15 },
]

export default function Dashboard() {
  const [attestations, setAttestations] = useState<Attestation[]>(DEMO)
  const [assetId, setAssetId] = useState('INV-2026-0500')
  const [source, setSource] = useState('invoice_feed_v2')
  const [running, setRunning] = useState(false)
  const [log, setLog] = useState<LogLine[]>([])
  const [lookupId, setLookupId] = useState('')
  const [lookupResult, setLookupResult] = useState<string | null>(null)
  const logRef = useRef<HTMLDivElement>(null)

  const addLine = (l: LogLine, d: number) =>
    new Promise<void>(r => setTimeout(() => { setLog(p => [...p, l]); logRef.current?.scrollTo({ top: 9999, behavior: 'smooth' }); r() }, d))

  const runPipeline = async () => {
    if (running) return
    setRunning(true); setLog([])
    await addLine({ time: '0.000', text: `Ingesting asset: ${assetId}`, type: 'info' }, 200)
    await addLine({ time: '0.005', text: `Source: ${source}`, type: 'info' }, 200)
    await addLine({ time: '0.050', text: 'Computing SHA-256 hash...', type: 'info' }, 400)
    await addLine({ time: '0.100', text: `Hash: ${Math.random().toString(16).slice(2, 18)}`, type: 'hash' }, 300)
    await addLine({ time: '0.110', text: 'Dedup check: unique ✓', type: 'success' }, 300)
    await addLine({ time: '0.500', text: 'Running 6-factor scoring...', type: 'info' }, 500)
    const scores = FACTORS.map(f => ({ ...f, v: 60 + Math.floor(Math.random() * 35) }))
    for (const s of scores) await addLine({ time: '0.6xx', text: `  ${s.name} (${s.weight}%): ${s.v}`, type: 'info' }, 150)
    const total = Math.round(scores.reduce((a, s) => a + s.v * s.weight / 100, 0))
    await addLine({ time: '1.200', text: `Composite score: ${total}`, type: total >= 65 ? 'success' : 'warn' }, 400)
    if (total >= 65) {
      await addLine({ time: '2.000', text: 'Score ≥ 65 — minting attestation NFT...', type: 'info' }, 600)
      await addLine({ time: '3.500', text: 'Attestation minted on Casper testnet', type: 'success' }, 800)
      await addLine({ time: '3.510', text: 'TTL: 86400s (24h)', type: 'warn' }, 200)
      setAttestations(p => [{ id: `att-${String(p.length + 1).padStart(3, '0')}`, assetId, score: total, status: 'active', ttl: 86400, created: new Date().toISOString(), issuer: '01' + Math.random().toString(16).slice(2, 14) + '...' }, ...p])
    } else {
      await addLine({ time: '2.000', text: 'Score < 65 — FLAGGED for manual review', type: 'warn' }, 600)
    }
    setRunning(false)
  }

  const lookup = () => {
    const f = attestations.find(a => a.id === lookupId || a.assetId === lookupId)
    setLookupResult(f ? `✓ ${f.id} | ${f.assetId} | Score: ${f.score} | ${f.status.toUpperCase()}` : '✗ No attestation found.')
  }

  const statusColor = (s: string) => {
    switch (s) {
      case 'active': return 'bg-green-500/10 text-green-400'
      case 'expired': return 'bg-rwa-gray/10 text-rwa-gray'
      case 'revoked': return 'bg-red-500/10 text-red-400'
      default: return 'bg-rwa-gray/10 text-rwa-gray'
    }
  }

  const active = attestations.filter(a => a.status === 'active').length
  const avgScore = Math.round(attestations.reduce((s, a) => s + a.score, 0) / attestations.length)

  return (
    <div className="pt-20 pb-16">
      <div className="rwa-section">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold">RWA-<span className="rwa-gradient-text">Sentinel</span> Dashboard</h1>
            <p className="text-sm text-rwa-gray mt-1">Verify assets, inspect attestations, monitor pipeline health.</p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-rwa-gray font-mono">casper-test</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Attestations', value: attestations.length, icon: Activity, color: 'text-rwa-amber' },
            { label: 'Active', value: active, icon: Shield, color: 'text-green-400' },
            { label: 'Avg Score', value: avgScore, icon: BarChart3, color: 'text-rwa-teal' },
            { label: 'Revoked', value: attestations.filter(a => a.status === 'revoked').length, icon: AlertTriangle, color: 'text-red-400' },
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
            <div>
              <label htmlFor="rwa-asset" className="text-xs text-rwa-gray mb-1 block">Asset ID</label>
              <input id="rwa-asset" value={assetId} onChange={e => setAssetId(e.target.value)}
                className="w-full bg-rwa-bg border border-rwa-border rounded-lg px-3 py-2 text-xs font-mono text-white focus:border-rwa-amber/50 focus:outline-none" />
            </div>
            <div>
              <label htmlFor="rwa-source" className="text-xs text-rwa-gray mb-1 block">Data Source</label>
              <input id="rwa-source" value={source} onChange={e => setSource(e.target.value)}
                className="w-full bg-rwa-bg border border-rwa-border rounded-lg px-3 py-2 text-xs font-mono text-white focus:border-rwa-amber/50 focus:outline-none" />
            </div>
            <button onClick={runPipeline} disabled={running}
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
              {log.length === 0 && <div className="text-rwa-gray-dark"><span className="animate-pulse">▌</span> Pipeline idle...</div>}
              {log.map((l, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-rwa-gray-dark shrink-0">[{l.time}]</span>
                  <span className={l.type === 'success' ? 'text-green-400' : l.type === 'warn' ? 'text-yellow-400' : l.type === 'hash' ? 'text-rwa-amber-bright' : 'text-rwa-gray'}>{l.text}</span>
                </div>
              ))}
              {running && <div className="text-rwa-gray-dark animate-pulse">▌</div>}
            </div>
          </div>
        </div>

        <div className="rwa-card !p-5 mb-8">
          <h3 className="font-semibold text-white flex items-center gap-2 mb-3"><Search size={16} className="text-rwa-amber" /> Lookup Attestation</h3>
          <div className="flex gap-3">
            <input value={lookupId} onChange={e => setLookupId(e.target.value)} placeholder="Attestation ID or Asset ID..."
              className="flex-1 bg-rwa-bg border border-rwa-border rounded-lg px-3 py-2 text-sm font-mono text-white focus:border-rwa-amber/50 focus:outline-none" />
            <button onClick={lookup} className="rwa-btn-primary !text-sm">Lookup</button>
          </div>
          {lookupResult && <div className={`mt-3 text-sm font-mono ${lookupResult.startsWith('✓') ? 'text-green-400' : 'text-red-400'}`}>{lookupResult}</div>}
        </div>

        <div className="rwa-card !p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-rwa-border flex items-center justify-between">
            <h3 className="font-semibold text-white">Attestation Explorer</h3>
            <span className="text-xs text-rwa-gray-dark">{attestations.length} records</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-rwa-border text-rwa-gray text-xs uppercase tracking-wider">
                  <th className="text-left py-3 px-5 font-medium">ID</th>
                  <th className="text-left py-3 px-5 font-medium">Asset</th>
                  <th className="text-left py-3 px-5 font-medium">Score</th>
                  <th className="text-left py-3 px-5 font-medium">Status</th>
                  <th className="text-left py-3 px-5 font-medium">TTL</th>
                  <th className="text-left py-3 px-5 font-medium">Issuer</th>
                </tr>
              </thead>
              <tbody>
                {attestations.map(a => (
                  <tr key={a.id} className="border-b border-rwa-border/50 hover:bg-rwa-amber/[0.02] transition-colors">
                    <td className="py-3 px-5 font-mono text-xs text-rwa-amber">{a.id}</td>
                    <td className="py-3 px-5 text-xs text-white font-semibold">{a.assetId}</td>
                    <td className="py-3 px-5">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-rwa-bg rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${a.score >= 65 ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${a.score}%` }} />
                        </div>
                        <span className="text-xs text-rwa-gray font-mono">{a.score}</span>
                      </div>
                    </td>
                    <td className="py-3 px-5">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(a.status)}`}>
                        ● {a.status.charAt(0).toUpperCase() + a.status.slice(1)}
                      </span>
                    </td>
                    <td className="py-3 px-5 text-xs text-rwa-gray-dark flex items-center gap-1"><Clock size={12} /> {a.ttl > 0 ? `${Math.round(a.ttl / 3600)}h` : '—'}</td>
                    <td className="py-3 px-5 font-mono text-xs text-rwa-gray">{a.issuer}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

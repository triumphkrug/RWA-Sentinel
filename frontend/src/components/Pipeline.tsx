import { FileSearch, BarChart3, Link2, Clock } from 'lucide-react'

const STEPS = [
  {
    n: 1, icon: FileSearch, title: 'Collect',
    desc: 'AI agent ingests invoice data from external sources. Deduplicates via SHA-256 hashing. Normalizes formats automatically.',
    code: 'POST /ingest { "source": "invoice_feed", "hash": "sha256:a1b2c3..." }',
  },
  {
    n: 2, icon: BarChart3, title: 'Score',
    desc: '6-factor weighted analysis: Issuer History (25%), Debtor Rating (20%), Amount Bounds (15%), Time Validity (15%), Detail Level (10%), Cross-Reference (15%).',
    code: 'score: { issuer: 88, debtor: 72, amount: 95, time: 85, detail: 90, xref: 78 } → 83.6',
  },
  {
    n: 3, icon: Link2, title: 'Attest',
    desc: 'Score ≥ 65? Batch-mint time-limited NFT attestation to Casper. Below threshold? Flagged for manual review.',
    code: 'deploy: attestation_nft { asset_id, score: 83, ttl: 86400, token_id: 42 }',
  },
  {
    n: 4, icon: Clock, title: 'Expire',
    desc: 'Attestation auto-expires after TTL. Staleness detector flags outdated data. DAO can vote to revoke early.',
    code: '[EXPIRED] token_id: 42 | created: 24h ago | status: STALE',
  },
]

export default function Pipeline() {
  return (
    <section id="pipeline" className="py-16 sm:py-24 relative">
      <div className="rwa-section">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4">
          Verification <span className="rwa-gradient-text">Pipeline</span>
        </h2>
        <p className="text-rwa-gray text-center max-w-lg mx-auto mb-12">
          From raw data to on-chain attestation in four automated steps.
        </p>

        <div className="relative max-w-4xl mx-auto">
          <div className="hidden sm:block absolute left-[23px] top-0 bottom-0 w-px bg-gradient-to-b from-rwa-amber via-rwa-teal to-rwa-gray" aria-hidden="true" />
          <div className="space-y-6">
            {STEPS.map(s => (
              <div key={s.n} className="flex items-start gap-5 group">
                <div className="relative z-10 shrink-0">
                  <div className="w-12 h-12 rounded-full bg-rwa-card border-2 border-rwa-amber/40 flex items-center justify-center text-rwa-amber font-bold group-hover:border-rwa-amber transition-colors">{s.n}</div>
                </div>
                <div className="rwa-card flex-1 !p-5">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="rwa-icon !w-9 !h-9 !rounded-lg">
                      <s.icon size={18} className="text-rwa-amber" />
                    </div>
                    <h3 className="font-bold text-white text-lg">{s.title}</h3>
                  </div>
                  <p className="text-sm text-rwa-gray leading-relaxed mb-3">{s.desc}</p>
                  <code className="block text-xs font-mono bg-rwa-bg/80 border border-rwa-border rounded-lg px-3 py-2 text-rwa-amber-bright overflow-x-auto">{s.code}</code>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

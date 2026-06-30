import { Clock, RefreshCw, Shield, TrendingDown } from 'lucide-react'

const reasons = [
  { icon: TrendingDown, title: 'Values depreciate', desc: 'A home appraised at $500K may drop 15% in 6 months. A perpetual attestation hides this risk from DeFi protocols using it as collateral.' },
  { icon: Clock, title: 'Data ages', desc: 'Market conditions, ownership status, regulatory environment — all change. Fresh verification ensures current truth, not historical snapshots.' },
  { icon: Shield, title: 'Accountability loop', desc: 'Time-limited attestations create a continuous verification cycle. Each re-attestation re-runs the full 6-factor analysis with current data.' },
  { icon: RefreshCw, title: 'Protocol protection', desc: 'DeFi protocols can reject expired attestations automatically. No human intervention needed — smart contracts check expiry natively.' },
]

export default function WhyTimeLimited() {
  return (
    <section className="py-24 bg-amber-50/30 border-y border-amber-100/50">
      <div className="rwa-section">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
            <span className="shimmer-text-gold">WHY TIME-LIMITED:</span>{' '}
            Perpetual attestations are a liability
          </h2>
          <p className="text-gray-600 text-lg mt-4">
            Most oracles issue attestations that never expire. That makes stale data indistinguishable from fresh data. We fix this.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {reasons.map((r, i) => (
            <div key={i} className="flex gap-4 items-start bg-white rounded-2xl p-6 border border-amber-100/60 shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                <r.icon className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 mb-1">{r.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{r.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

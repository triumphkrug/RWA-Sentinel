import { useEffect, useRef, useState } from 'react'
import { Receipt, Building2, Ship, Globe2 } from 'lucide-react'

const cases = [
  {
    icon: Receipt,
    title: 'Invoice Factoring',
    desc: 'Suppliers tokenize receivables for DeFi lending. The oracle scores each invoice across 6 factors and mints a time-limited attestation NFT. Lenders accept only fresh, passing attestations as collateral.',
    before: 'Manual review: 3-5 days, $200+ per invoice, single auditor opinion.',
    after: 'Automated: <3s scoring, transparent factor breakdown, continuous reverification.',
    color: 'blue',
  },
  {
    icon: Building2,
    title: 'Real Estate Collateral',
    desc: 'Property-backed DeFi loans require current valuations. RWA-Sentinel checks market data, ownership records, and comparable sales in real-time, issuing 24h attestations that force regular re-appraisal.',
    before: 'Appraisals valid for 6-12 months. Property values can drop 30% unnoticed.',
    after: '24h attestations. Expired? Smart contract blocks new loans until re-verified.',
    color: 'amber',
  },
  {
    icon: Ship,
    title: 'Supply Chain Finance',
    desc: 'Cross-border goods need verified provenance. The pipeline cross-references shipping manifests, customs records, and IoT temperature logs to produce trust scores for perishable commodity financing.',
    before: 'Paper-based verification with weeks of delays and fraud exposure.',
    after: 'Multi-source cross-ref with anomaly detection. Scores update as goods move.',
    color: 'green',
  },
  {
    icon: Globe2,
    title: 'Cross-Border Trade',
    desc: 'Letters of credit and trade receivables span multiple jurisdictions. The oracle validates entity registrations, payment histories, and regulatory compliance across borders before issuing attestations.',
    before: 'Banks spend $50K+ per trade on compliance. Manual, slow, error-prone.',
    after: 'Automated entity registry check + debtor rating + amount reasonableness scoring.',
    color: 'purple',
  },
]

const colorMap: Record<string, { bg: string; text: string; border: string }> = {
  blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' },
  green: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' },
}

export default function UseCases() {
  const ref = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true) }, { threshold: 0.1 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  return (
    <section ref={ref} id="use-cases" className="py-24 bg-white">
      <div className="rwa-section">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
            <span className="shimmer-text">USE CASES:</span>{' '}
            Real-world assets, real verification
          </h2>
        </div>

        <div className={`grid md:grid-cols-2 gap-6 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {cases.map((c, i) => {
            const cm = colorMap[c.color]
            return (
              <div key={i} className="rwa-card overflow-hidden" style={{ transitionDelay: `${i * 100}ms` }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-lg ${cm.bg} flex items-center justify-center`}>
                    <c.icon className={`w-5 h-5 ${cm.text}`} />
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg">{c.title}</h3>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed mb-4">{c.desc}</p>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-red-50/60 rounded-xl p-3 border border-red-100">
                    <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-1">Before</p>
                    <p className="text-xs text-gray-600 leading-relaxed">{c.before}</p>
                  </div>
                  <div className="bg-green-50/60 rounded-xl p-3 border border-green-100">
                    <p className="text-[10px] font-bold text-green-500 uppercase tracking-wider mb-1">After</p>
                    <p className="text-xs text-gray-600 leading-relaxed">{c.after}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

import { useEffect, useRef, useState } from 'react'
import { Fingerprint, TrendingUp, Clock, GitBranch, ShieldAlert, Database } from 'lucide-react'

const factors = [
  { icon: Fingerprint, name: 'Provenance', score: 92, desc: 'Traces asset origin through verified registries and ownership chains.' },
  { icon: TrendingUp, name: 'Market Consistency', score: 87, desc: 'Cross-checks asset value against current market data and comparable sales.' },
  { icon: Clock, name: 'Temporal Freshness', score: 95, desc: 'Ensures data was collected within the required recency window.' },
  { icon: GitBranch, name: 'Cross-Reference', score: 88, desc: 'Validates data against 3+ independent sources for consistency.' },
  { icon: ShieldAlert, name: 'Anomaly Detection', score: 91, desc: 'AI-powered pattern analysis flags statistical outliers and fraud signals.' },
  { icon: Database, name: 'Source Reliability', score: 94, desc: 'Rates data sources by historical accuracy, uptime, and trust track record.' },
]

export default function TrustFactors() {
  const ref = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true) }, { threshold: 0.1 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  return (
    <section ref={ref} id="factors" className="py-24 bg-white">
      <div className="rwa-section">
        <div className="flex flex-col lg:flex-row gap-16 items-start">
          {/* Left: explanation */}
          <div className="lg:w-2/5 lg:sticky lg:top-24">
            <p className="text-sm font-semibold text-amber-600 tracking-wide mb-3">TRUST SCORE</p>
            <h2 className="text-3xl font-extrabold text-gray-900 mb-4">
              6 factors. One score. Full transparency.
            </h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Every asset verification produces a composite trust score from six independent factors. Each factor is weighted, scored, and its evidence is hashed on-chain.
            </p>
            <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
              <p className="text-sm text-blue-800 font-semibold mb-2">Composite Score</p>
              <p className="text-5xl font-extrabold text-blue-600">91.2</p>
              <p className="text-sm text-blue-600/70 mt-1">Threshold: 75 &middot; Status: VERIFIED</p>
            </div>
          </div>

          {/* Right: factor cards */}
          <div className={`lg:w-3/5 grid sm:grid-cols-2 gap-4 transition-all duration-700 ${visible ? 'opacity-100' : 'opacity-0 translate-y-8'}`}>
            {factors.map((f, i) => (
              <div key={i} className="rwa-card group" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                    <f.icon className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="text-2xl font-bold text-blue-600">{f.score}</span>
                </div>
                <h3 className="font-bold text-gray-900 mb-1">{f.name}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-1000"
                    style={{ width: visible ? `${f.score}%` : '0%', transitionDelay: `${i * 0.15}s` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

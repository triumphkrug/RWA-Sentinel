import { useEffect, useRef, useState } from 'react'
import { Fingerprint, TrendingUp, Clock, GitBranch, ShieldAlert, Database } from 'lucide-react'

const factors = [
  { icon: Fingerprint, name: 'Provenance', score: 92, desc: 'Traces asset origin through verified registries and ownership chains.' },
  { icon: TrendingUp, name: 'Market Consistency', score: 87, desc: 'Cross-checks asset value against current market data and comparable sales.' },
  { icon: Clock, name: 'Temporal Freshness', score: 95, desc: 'Ensures data was collected within the required recency window.' },
  { icon: GitBranch, name: 'Cross-Reference', score: 88, desc: 'Validates data against 3+ independent sources for consistency.' },
  { icon: ShieldAlert, name: 'Anomaly Detection', score: 91, desc: 'Pattern analysis flags statistical outliers and fraud signals.' },
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
    <section ref={ref} id="factors" className="py-24 bg-slate-50 border-y border-gray-100">
      <div className="rwa-section">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
            <span className="shimmer-text">TRUST SCORE:</span>{' '}
            Six dimensions of verification
          </h2>
        </div>

        <div className={`grid sm:grid-cols-2 lg:grid-cols-3 gap-5 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {factors.map((f, i) => (
            <div key={i} className="rwa-card" style={{ transitionDelay: `${i * 80}ms` }}>
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <f.icon className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-2xl font-bold text-gray-900">{visible ? f.score : 0}</span>
              </div>
              <h3 className="font-bold text-gray-900 mb-1.5">{f.name}</h3>
              <p className="text-sm text-gray-500 leading-relaxed mb-3">{f.desc}</p>
              {/* Score bar */}
              <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-1000 ease-out"
                  style={{ width: visible ? `${f.score}%` : '0%', transitionDelay: `${300 + i * 100}ms` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

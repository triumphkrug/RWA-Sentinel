import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Clock, FileX, ShieldOff } from 'lucide-react'

export default function Problem() {
  const ref = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true) }, { threshold: 0.15 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  const problems = [
    { icon: ShieldOff, title: '$3.2B in RWA fraud', desc: 'Annual losses from unverified or stale real-world asset data in DeFi protocols.' },
    { icon: Clock, title: 'Static attestations lie', desc: 'A property appraised 6 months ago may have lost 30% of its value. Static proofs hide this.' },
    { icon: FileX, title: 'Manual verification fails', desc: 'Human oracles are slow, expensive, and introduce single points of failure.' },
    { icon: AlertTriangle, title: 'No expiration = no accountability', desc: 'Most oracle attestations live forever. Truth doesn\'t. Neither should proofs.' },
  ]

  return (
    <section ref={ref} className="py-24 bg-white border-t border-gray-100">
      <div className="rwa-section">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-sm font-semibold text-amber-600 tracking-wide mb-3">THE PROBLEM</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
            Stale data costs billions.
          </h2>
          <p className="text-gray-500 text-lg">
            DeFi protocols trust oracle data that was accurate once. RWA-Sentinel ensures accuracy is continuous.
          </p>
        </div>

        <div className={`grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto transition-all duration-700 ${visible ? 'opacity-100' : 'opacity-0 translate-y-8'}`}>
          {problems.map((p, i) => (
            <div key={i} className="flex gap-4 p-6 rounded-2xl bg-red-50/50 border border-red-100/50" style={{ animationDelay: `${i * 0.1}s` }}>
              <div className="w-11 h-11 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <p.icon className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 mb-1">{p.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

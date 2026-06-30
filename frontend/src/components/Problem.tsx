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
    { icon: AlertTriangle, title: 'No expiration = no accountability', desc: "Most oracle attestations live forever. Truth doesn't. Neither should proofs." },
  ]

  return (
    <section ref={ref} id="problem" className="py-24 bg-slate-50 border-y border-gray-100">
      <div className="rwa-section">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
            <span className="shimmer-text">THE PROBLEM:</span>{' '}
            Stale data costs billions
          </h2>
        </div>

        <div className={`grid sm:grid-cols-2 lg:grid-cols-4 gap-5 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {problems.map((p, i) => (
            <div
              key={i}
              className="rwa-card text-center"
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mx-auto mb-4">
                <p.icon className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">{p.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

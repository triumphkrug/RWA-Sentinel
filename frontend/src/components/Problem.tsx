import { useEffect, useRef, useState } from 'react'

const features = [
  {
    icon: '🛡️',
    title: 'AI Verified',
    desc: 'Intelligent verification powered by multi-model consensus.',
    color: 'border-rwa-blue/20 hover:border-rwa-blue/50',
  },
  {
    icon: '🔗',
    title: 'On-Chain',
    desc: 'Tamper-proof attestations on Casper Network.',
    color: 'border-rwa-gold/20 hover:border-rwa-gold/50',
  },
  {
    icon: '🏛️',
    title: 'Trustless',
    desc: 'Decentralized. Transparent. Always verifiable.',
    color: 'border-green-200 hover:border-green-400',
  },
]

export default function Problem() {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true) }, { threshold: 0.2 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  return (
    <section className="py-20 bg-gray-50" ref={ref}>
      <div className="rwa-section">
        <div className="grid md:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div
              key={i}
              className={`group p-6 rounded-2xl bg-white border-2 ${f.color} shadow-sm hover:shadow-lg transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
              style={{ transitionDelay: `${i * 120}ms` }}
            >
              <span className="text-3xl mb-4 block">{f.icon}</span>
              <h3 className="text-lg font-bold text-gray-900 mb-2 uppercase tracking-wide">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Oracle section */}
        <div className="mt-20 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-xs uppercase tracking-widest text-rwa-gold font-semibold mb-2">The Oracle</p>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Guardian of Truth</h2>
            <div className="space-y-4 text-sm text-gray-600">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 w-6 h-6 rounded-full bg-rwa-gold/10 flex items-center justify-center text-rwa-gold shrink-0">✦</span>
                <p>Symbolizes wisdom, trust, and divine verification</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 w-6 h-6 rounded-full bg-rwa-gold/10 flex items-center justify-center text-rwa-gold shrink-0">✦</span>
                <p>Guardian of real-world truth in a decentralized future</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 w-6 h-6 rounded-full bg-rwa-gold/10 flex items-center justify-center text-rwa-gold shrink-0">✦</span>
                <p>Powered by crypto. Secured by consensus. Driven by purpose.</p>
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <img
              src="/images/mascot/god_why.png"
              alt="Oracle"
              className={`w-64 lg:w-80 drop-shadow-[0_10px_40px_rgba(184,144,48,0.15)] transition-all duration-700 ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
              style={{ transitionDelay: '400ms' }}
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </section>
  )
}

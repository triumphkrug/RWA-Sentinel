import { useEffect, useRef, useState } from 'react'

const steps = [
  { num: 1, title: 'Collect', desc: 'Agents gather real-world data from trusted sources.', icon: '📥' },
  { num: 2, title: 'Verify', desc: 'Cross-check and validate against multiple signals.', icon: '🔍' },
  { num: 3, title: 'Attest', desc: 'Generate batch NFT attestations with time limits.', icon: '📜' },
  { num: 4, title: 'Publish', desc: 'On-chain via Casper Network. Verifiable forever.', icon: '🌐' },
]

export default function Pipeline() {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true) }, { threshold: 0.2 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  return (
    <section id="how-it-works" className="py-24 bg-white relative" ref={ref}>
      <div className="rwa-section">
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          {/* Left: How it works */}
          <div>
            <p className="text-xs uppercase tracking-widest text-rwa-gold font-semibold mb-2">Pipeline</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-12">
              How RWA-Sentinel Works
            </h2>

            <div className="space-y-8 relative">
              {/* Vertical line */}
              <div className="absolute left-[18px] top-2 bottom-2 w-px bg-gradient-to-b from-rwa-blue/40 to-rwa-gold/40" />

              {steps.map((s, i) => (
                <div
                  key={i}
                  className={`relative flex items-start gap-5 transition-all duration-700 ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}
                  style={{ transitionDelay: `${i * 150}ms` }}
                >
                  <div className="w-9 h-9 rounded-full bg-rwa-blue text-white flex items-center justify-center text-sm font-bold shrink-0 relative z-10 shadow-md">
                    {s.num}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{s.title}</h3>
                    <p className="text-sm text-gray-500">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 p-4 rounded-xl bg-gray-50 border border-gray-100">
              <p className="text-sm font-semibold text-gray-800 mb-1">Focused On Invoices</p>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="px-2 py-0.5 rounded bg-rwa-blue/10 text-rwa-blue font-medium">Extract</span>
                <span>→</span>
                <span className="px-2 py-0.5 rounded bg-rwa-blue/10 text-rwa-blue font-medium">Validate</span>
                <span>→</span>
                <span className="px-2 py-0.5 rounded bg-rwa-gold/10 text-rwa-gold font-medium">Attest</span>
                <span>→</span>
                <span className="px-2 py-0.5 rounded bg-rwa-gold/10 text-rwa-gold font-medium">Tokenize</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">From real-world invoice to on-chain proof.</p>
            </div>
          </div>

          {/* Right: God with book + dashboard preview */}
          <div className="space-y-8">
            {/* Dashboard preview */}
            <div className={`rounded-2xl border border-gray-200 bg-white shadow-xl overflow-hidden transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '300ms' }}>
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center gap-2 mb-3">
                  <img src="/images/logo.png" alt="" className="w-5 h-5" />
                  <span className="text-sm font-bold text-gray-900">Dashboard</span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  {[
                    { v: '24,531', l: 'Total Assets', c: 'text-rwa-blue' },
                    { v: '6,842', l: 'Attestations', c: 'text-rwa-gold' },
                    { v: '5', l: 'Networks', c: 'text-green-600' },
                    { v: '99.9%', l: 'Uptime', c: 'text-gray-900' },
                  ].map((s, i) => (
                    <div key={i} className="p-2 rounded-lg bg-gray-50">
                      <p className={`text-lg font-bold ${s.c}`}>{s.v}</p>
                      <p className="text-[10px] text-gray-400">{s.l}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-4">
                <p className="text-xs font-semibold text-gray-600 mb-2">Recent Batches</p>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-400 border-b border-gray-100">
                      <th className="text-left py-1 font-medium">Batch ID</th>
                      <th className="text-left py-1 font-medium">Assets</th>
                      <th className="text-left py-1 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { id: '#BATCH-1042', assets: 128, status: 'Verified' },
                      { id: '#BATCH-1041', assets: 96, status: 'Verified' },
                      { id: '#BATCH-1040', assets: 210, status: 'Verified' },
                    ].map((b, i) => (
                      <tr key={i} className="border-b border-gray-50">
                        <td className="py-2 font-mono text-gray-700">{b.id}</td>
                        <td className="py-2 text-gray-600">{b.assets}</td>
                        <td className="py-2"><span className="px-1.5 py-0.5 rounded bg-green-50 text-green-600 text-[10px] font-medium">✓ {b.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* God with book */}
            <div className="flex justify-end">
              <img src="/images/mascot/god_book.png" alt="The Oracle" className="w-48 drop-shadow-[0_10px_30px_rgba(184,144,48,0.2)]" loading="lazy" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

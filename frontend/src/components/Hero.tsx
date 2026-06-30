import { useEffect, useRef } from 'react'

export default function Hero() {
  const bgRef = useRef<HTMLDivElement>(null)
  const godRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const handler = () => {
      const y = window.scrollY
      if (bgRef.current) bgRef.current.style.transform = `translateY(${y * 0.3}px)`
      if (godRef.current) godRef.current.style.transform = `translateY(${y * 0.1}px)`
    }
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <section id="home" className="relative min-h-screen flex items-end overflow-hidden">
      {/* Sky background with parallax */}
      <div ref={bgRef} className="absolute inset-0 z-0">
        <img src="/images/bg_hero.webp" alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-transparent to-white" />
      </div>

      {/* Clouds front layer - animated */}
      <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden opacity-30">
        <div className="absolute -left-[20%] top-[15%] w-[60%] h-40 bg-white/60 rounded-full blur-[60px] animate-cloud-drift" />
        <div className="absolute -right-[15%] top-[25%] w-[50%] h-32 bg-white/40 rounded-full blur-[50px] animate-cloud-drift-slow" />
      </div>

      {/* God on throne - right side */}
      <div className="absolute right-0 bottom-0 z-10 w-1/2 lg:w-[45%] max-w-2xl">
        <img
          ref={godRef}
          src="/images/mascot/god_tron_hero.webp"
          alt="RWA-Sentinel Oracle"
          className="w-full drop-shadow-[0_0_60px_rgba(184,144,48,0.3)]"
          loading="eager"
        />
      </div>

      {/* Clouds behind throne layer */}
      <div className="absolute inset-0 z-[5] pointer-events-none overflow-hidden opacity-20">
        <div className="absolute right-[10%] top-[30%] w-[40%] h-28 bg-white/50 rounded-full blur-[40px]" />
      </div>

      {/* Content */}
      <div className="rwa-section relative z-30 pb-24 pt-32">
        <div className="max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full bg-rwa-blue/10 border border-rwa-blue/20 text-rwa-blue text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-rwa-blue animate-pulse" />
            AI-POWERED ORACLE ON CASPER
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-[1.1] mb-6">
            Verify the Real.<br />
            <span className="text-rwa-blue">On-Chain.</span>
          </h1>

          <p className="text-lg text-gray-600 mb-8 leading-relaxed">
            RWA-Sentinel is an oracle that validates real-world assets and issues trustless attestations on Casper Network.
          </p>

          <div className="flex flex-wrap gap-4 mb-12">
            <a href="/app" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-rwa-blue text-white font-semibold shadow-lg shadow-rwa-blue/20 hover:shadow-rwa-blue/30 hover:scale-[1.02] transition-all">
              Launch App
            </a>
            <a href="https://github.com/triumphkrug/RWA-Sentinel" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors">
              Read Docs
            </a>
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { val: '12,842', label: 'Assets Verified' },
              { val: '3,421', label: 'Attestations' },
              { val: '8', label: 'Integrations' },
              { val: '99.9%', label: 'Uptime' },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <p className="text-xl sm:text-2xl font-bold text-rwa-blue">{s.val}</p>
                <p className="text-[10px] sm:text-xs text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

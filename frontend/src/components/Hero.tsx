import { useEffect, useRef, useState, useMemo } from 'react'
import { Shield, Zap, Globe, TrendingUp } from 'lucide-react'

/* ── procedural cloud generator ── */
function CloudLayer() {
  const clouds = useMemo(() => {
    const seed = [0.23, 0.67, 0.12, 0.89, 0.45, 0.34, 0.78, 0.56, 0.6, 0.15]
    return seed.map((s, i) => {
      const w = 160 + s * 320
      const h = 50 + s * 100
      const top = 5 + (s * 55)
      const blur = 20 + s * 35
      const opacity = 0.35 + s * 0.35
      const dur = 28 + i * 8
      const delay = -(s * dur)
      const dir = i % 2 === 0 ? 'drift-right' : 'drift-left'
      return { w, h, top, blur, opacity, dur, delay, dir, key: i }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="absolute inset-0 z-[8] pointer-events-none overflow-hidden">
      {clouds.map(c => (
        <div
          key={c.key}
          className="absolute rounded-full bg-white"
          style={{
            width: `${c.w}px`,
            height: `${c.h}px`,
            top: `${c.top}%`,
            filter: `blur(${c.blur}px)`,
            opacity: c.opacity,
            animation: `${c.dir} ${c.dur}s linear infinite`,
            animationDelay: `${c.delay}s`,
          }}
        />
      ))}
    </div>
  )
}

export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null)
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    const handler = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const stats = [
    { icon: Shield, val: '6-Factor', label: 'Trust Score' },
    { icon: Zap, val: '<3s', label: 'Verification' },
    { icon: Globe, val: '6', label: 'Smart Contracts' },
    { icon: TrendingUp, val: '100%', label: 'On-Chain' },
  ]

  return (
    <section ref={sectionRef} id="home" className="relative min-h-[100vh] flex items-end overflow-hidden">
      {/* Sky background with parallax */}
      <div className="absolute inset-0 z-0" style={{ transform: `translateY(${scrollY * 0.25}px)` }}>
        <img src="/images/bg_hero.webp" alt="" className="w-full h-full object-cover" loading="eager" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-transparent to-white" />
      </div>

      {/* Procedural clouds – behind mascot */}
      <CloudLayer />

      {/* Smaller clouds in front of mascot */}
      <div className="absolute inset-0 z-[25] pointer-events-none overflow-hidden">
        <div className="absolute top-[15%] w-[90px] h-[30px] bg-white/20 rounded-full blur-[25px] animate-drift-r" style={{ animationDuration: '22s' }} />
        <div className="absolute top-[35%] w-[70px] h-[25px] bg-white/15 rounded-full blur-[20px] animate-drift-l" style={{ animationDuration: '30s', animationDelay: '-8s' }} />
        <div className="absolute top-[50%] w-[60px] h-[20px] bg-white/18 rounded-full blur-[18px] animate-drift-r" style={{ animationDuration: '26s', animationDelay: '-14s' }} />
      </div>

      {/* God on throne – right side, fixed height */}
      <div className="absolute right-0 bottom-0 z-10 flex items-end justify-end w-[55%] max-w-[95vw]">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[70%] h-[70%] rounded-full bg-gradient-radial from-yellow-400/20 to-transparent blur-[40px] animate-chest-glow" />
        </div>
        <img
          src="/images/mascot/god_tron_hero.webp"
          alt="RWA-Sentinel Oracle"
          className="w-full min-h-[420px] sm:min-h-[520px] object-contain object-bottom animate-throne-glow relative z-10"
          style={{ transform: `translateY(${scrollY * 0.08}px)` }}
          loading="eager"
        />
      </div>

      {/* Content */}
      <div className="rwa-section relative z-30 pb-20 pt-28 lg:pt-36">
        <div className="max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-6 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            CASPER NETWORK &middot; AI ORACLE
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-extrabold text-gray-900 leading-[1.08] mb-5 tracking-tight">
            Truth has an<br />
            expiration date.<br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-amber-500">We enforce it.</span>
          </h1>

          <p className="text-lg text-gray-700 mb-8 leading-relaxed max-w-md bg-white/70 backdrop-blur-sm rounded-xl px-4 py-3 border border-gray-100/60">
            RWA-Sentinel scores real-world assets with a 6-factor AI pipeline and anchors time-limited attestations on Casper. When the attestation expires, reverification is required &mdash; because stale data is dangerous data.
          </p>

          <div className="flex flex-wrap gap-3 mb-10">
            <a href="/portal" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-blue-600 text-white font-semibold shadow-lg shadow-blue-600/20 hover:bg-blue-700 hover:shadow-blue-600/30 transition-all">
              Launch Oracle
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            </a>
            <a href="https://github.com/triumphkrug/RWA-Sentinel" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" /></svg>
              GitHub
            </a>
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-4 gap-3 max-w-lg mb-6">
            {stats.map((s, i) => (
              <div key={i} className="text-center bg-white/80 backdrop-blur rounded-xl py-3 px-2 border border-gray-100 shadow-sm">
                <s.icon className="w-5 h-5 mx-auto mb-1 text-blue-600" />
                <p className="text-lg font-bold text-gray-900">{s.val}</p>
                <p className="text-[10px] text-gray-500 font-medium">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Contract info — moved from footer */}
          <div className="max-w-lg bg-white/70 backdrop-blur rounded-xl px-4 py-3 border border-gray-100 text-sm text-gray-600">
            <span className="font-semibold text-gray-800">6 smart contracts</span> deployed on Casper testnet — asset registry, attestation NFTs, governance DAO, oracle slashing, KYC gate, and stake deposits.
          </div>
        </div>
      </div>
    </section>
  )
}

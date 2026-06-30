import { useEffect, useRef, useState } from 'react'
import { Shield, Zap, Globe, TrendingUp } from 'lucide-react'

export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null)
  const godRef = useRef<HTMLImageElement>(null)
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    const handler = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const stats = [
    { icon: Shield, val: '6-Factor', label: 'Trust Score' },
    { icon: Zap, val: '<3s', label: 'Verification' },
    { icon: Globe, val: '3', label: 'Smart Contracts' },
    { icon: TrendingUp, val: '100%', label: 'On-Chain' },
  ]

  return (
    <section ref={sectionRef} id="home" className="relative min-h-[100vh] flex items-end overflow-hidden">
      {/* Sky background with parallax */}
      <div className="absolute inset-0 z-0" style={{ transform: `translateY(${scrollY * 0.25}px)` }}>
        <img src="/images/bg_hero.webp" alt="" className="w-full h-full object-cover" loading="eager" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-transparent to-white" />
      </div>

      {/* Animated clouds - front layer */}
      <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
        <div className="absolute top-[12%] w-[55%] h-36 bg-white/50 rounded-full blur-[70px] animate-drift-r" />
        <div className="absolute top-[22%] w-[45%] h-28 bg-white/30 rounded-full blur-[60px] animate-drift-l" style={{ animationDelay: '-10s' }} />
        <div className="absolute top-[8%] w-[35%] h-20 bg-white/40 rounded-full blur-[50px] animate-drift-r" style={{ animationDelay: '-20s' }} />
      </div>

      {/* Clouds behind throne */}
      <div className="absolute inset-0 z-[5] pointer-events-none overflow-hidden">
        <div className="absolute right-[5%] top-[25%] w-[45%] h-32 bg-white/40 rounded-full blur-[50px]" />
      </div>

      {/* God on throne - right side */}
      <div className="absolute right-0 bottom-0 z-10 w-[55%] sm:w-1/2 lg:w-[48%] max-w-3xl flex items-end justify-end">
        {/* Glow behind throne */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[70%] h-[70%] rounded-full bg-gradient-radial from-yellow-400/20 to-transparent blur-[40px] animate-chest-glow" />
        </div>
        <img
          ref={godRef}
          src="/images/mascot/god_tron_hero.webp"
          alt="RWA-Sentinel Oracle"
          className="w-full animate-throne-glow relative z-10"
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

          <p className="text-lg text-gray-600 mb-8 leading-relaxed max-w-md">
            RWA-Sentinel scores real-world assets with a 6-factor AI pipeline and anchors time-limited attestations on Casper. When the attestation expires, reverification is required &mdash; because stale data is dangerous data.
          </p>

          <div className="flex flex-wrap gap-3 mb-14">
            <a href="/app" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-blue-600 text-white font-semibold shadow-lg shadow-blue-600/20 hover:bg-blue-700 hover:shadow-blue-600/30 transition-all">
              Launch Oracle
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            </a>
            <a href="https://github.com/triumphkrug/RWA-Sentinel" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
              GitHub
            </a>
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-4 gap-3 max-w-lg">
            {stats.map((s, i) => (
              <div key={i} className="text-center bg-white/80 backdrop-blur rounded-xl py-3 px-2 border border-gray-100 shadow-sm">
                <s.icon className="w-5 h-5 mx-auto mb-1 text-blue-600" />
                <p className="text-lg font-bold text-gray-900">{s.val}</p>
                <p className="text-[10px] text-gray-500 font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile: throne below text */}
      <style>{`
        @media (max-width: 768px) {
          section#home > div:nth-child(5) {
            position: relative !important;
            width: 95% !important;
            max-width: none !important;
            margin: 0 auto;
            right: auto !important;
            bottom: auto !important;
            display: flex;
            justify-content: center;
          }
        }
      `}</style>
    </section>
  )
}

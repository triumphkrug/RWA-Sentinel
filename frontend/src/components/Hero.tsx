import { ArrowRight, FileText } from 'lucide-react'

export default function Hero() {
  return (
    <section id="home" className="relative min-h-screen flex items-center overflow-hidden pt-16">
      <div className="absolute inset-0 bg-gradient-to-b from-rwa-bg via-[#0f2236] to-rwa-bg" aria-hidden="true" />
      {/* Subtle grid */}
      <div className="absolute inset-0 opacity-[0.03]" aria-hidden="true"
        style={{ backgroundImage: 'linear-gradient(rgba(244,162,97,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(244,162,97,0.4) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
      {/* Glow orbs */}
      <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-rwa-amber/8 rounded-full blur-[100px]" aria-hidden="true" />
      <div className="absolute bottom-1/4 right-1/4 w-[250px] h-[250px] bg-rwa-teal/8 rounded-full blur-[100px]" aria-hidden="true" />

      <div className="rwa-section relative z-10 flex flex-col items-center text-center py-20">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rwa-amber/10 border border-rwa-amber/20 text-sm text-rwa-amber mb-8 animate-fade-in-up">
          <span className="w-2 h-2 rounded-full bg-rwa-teal animate-pulse" />
          AI Oracle · Casper Testnet
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.1] tracking-tight mb-6 max-w-3xl animate-fade-in-up">
          Real-World Assets Need<br />
          <span className="rwa-gradient-text">Real-Time Proof</span>
        </h1>

        <p className="text-lg sm:text-xl text-rwa-gray leading-relaxed mb-10 max-w-2xl animate-fade-in-up">
          Autonomous AI oracle that scores, verifies, and attests off-chain assets to Casper blockchain. Attestations expire because truth does too.
        </p>

        <div className="flex flex-wrap justify-center gap-4 mb-12 animate-fade-in-up">
          <a href="#pipeline" className="rwa-btn-primary">
            Run the Pipeline <ArrowRight size={18} />
          </a>
          <a href="https://github.com/triumphkrug/RWA-Sentinel" target="_blank" rel="noopener noreferrer" className="rwa-btn-outline">
            Read Docs <FileText size={16} />
          </a>
        </div>

        <div className="flex flex-wrap justify-center gap-4 sm:gap-8 text-xs text-rwa-gray-dark animate-fade-in-up">
          {[
            { label: '2 Smart Contracts', icon: '📄' },
            { label: '6-Factor Scoring', icon: '📊' },
            { label: 'Time-Limited NFTs', icon: '⏳' },
            { label: 'DAO Governance', icon: '🗳' },
          ].map(t => (
            <span key={t.label} className="flex items-center gap-1.5">
              <span>{t.icon}</span><span>{t.label}</span>
            </span>
          ))}
        </div>

        {/* Pipeline preview */}
        <div className="mt-16 rwa-card !p-4 sm:!p-6 max-w-2xl w-full animate-fade-in-up">
          <div className="flex items-center justify-between gap-2 sm:gap-4 text-xs font-mono">
            {[
              { icon: '📁', label: 'Collect', color: 'bg-rwa-amber/15 border-rwa-amber/25' },
              { icon: '📊', label: 'Score', color: 'bg-rwa-teal/15 border-rwa-teal/25' },
              { icon: '🔗', label: 'Attest', color: 'bg-green-500/15 border-green-500/25' },
              { icon: '⏳', label: 'Expire', color: 'bg-rwa-gray/15 border-rwa-gray/25' },
            ].map((s, i) => (
              <div key={s.label} className="flex items-center gap-2 sm:gap-3">
                <div className="text-center">
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl ${s.color} border flex items-center justify-center mb-1`}>
                    <span className="text-lg">{s.icon}</span>
                  </div>
                  <span className="text-rwa-gray text-[10px]">{s.label}</span>
                </div>
                {i < 3 && (
                  <div className="flex-shrink-0 w-4 sm:w-8 h-px bg-gradient-to-r from-rwa-amber/40 to-rwa-teal/40 relative">
                    <div className="absolute top-1/2 right-0 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-rwa-amber animate-pulse" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

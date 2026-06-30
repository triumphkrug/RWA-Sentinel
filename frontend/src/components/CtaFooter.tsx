export default function CtaFooter() {
  return (
    <section className="py-20 bg-white relative overflow-hidden">
      <div className="rwa-section relative z-10">
        <div className="relative rounded-2xl bg-gradient-to-r from-rwa-blue to-blue-700 p-8 sm:p-12 overflow-hidden text-white">
          {/* Gold accent */}
          <div className="absolute -top-20 -right-20 w-60 h-60 bg-rwa-gold/20 rounded-full blur-[80px] pointer-events-none" />

          <div className="flex flex-col md:flex-row items-center gap-8">
            <img src="/images/mascot/god_fly.png" alt="" className="w-32 sm:w-40 drop-shadow-[0_10px_30px_rgba(0,0,0,0.3)]" loading="lazy" />

            <div className="flex-1 text-center md:text-left">
              <h2 className="text-2xl sm:text-3xl font-bold mb-2">
                Ready to verify real-world assets?
              </h2>
              <p className="text-blue-100 mb-6">
                Join the future of trustless attestation on <strong>Casper Network</strong>.
              </p>
              <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                <a href="/app" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-white text-rwa-blue font-semibold hover:scale-[1.02] transition-transform shadow-lg">
                  Launch App
                </a>
                <a href="https://github.com/triumphkrug/RWA-Sentinel" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-white/30 text-white font-medium hover:bg-white/10 transition-colors">
                  Read Docs
                </a>
              </div>
            </div>

            <img src="/images/casper-logo.png" alt="Casper" className="w-10 h-10 opacity-40 hidden md:block" />
          </div>
        </div>
      </div>
    </section>
  )
}

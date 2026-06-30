export default function CtaFooter() {
  return (
    <section className="py-20 bg-gray-50/50">
      <div className="rwa-section">
        <div className="relative bg-white rounded-3xl border-2 border-amber-300 overflow-hidden shadow-sm" style={{ minHeight: '320px' }}>
          {/* Mascot – 90% of block height */}
          <div className="hidden md:flex absolute right-6 top-0 bottom-0 items-end z-0 pointer-events-none" style={{ height: '100%' }}>
            <img
              src="/images/mascot/god_tron_right.webp"
              alt="Oracle"
              className="object-contain"
              style={{ height: '90%' }}
            />
          </div>

          <div className="relative z-10 p-10 lg:p-14">
            <div className="max-w-lg">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
                <span className="shimmer-text-gold">START VERIFYING:</span><br />
                Real-world assets on-chain
              </h2>
              <p className="text-gray-600 mb-8 text-lg leading-relaxed">
                Launch the oracle dashboard, connect your wallet, and run your first verification pipeline in under a minute.
              </p>
              <div className="flex flex-wrap gap-3">
                <a href="/app" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-blue-600 text-white font-semibold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all">
                  Launch Oracle
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                </a>
                <a href="https://github.com/triumphkrug/RWA-Sentinel" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors">
                  View on GitHub
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

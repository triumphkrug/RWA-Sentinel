export default function CtaFooter() {
  return (
    <section className="py-20 bg-gray-50/50">
      <div className="rwa-section">
        <div className="relative bg-white rounded-3xl border-2 border-amber-300 p-10 lg:p-14 overflow-hidden shadow-sm">
          <div className="relative z-10 max-w-lg">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
              Start verifying<br />real-world assets.
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

          {/* Mascot on right */}
          <div className="hidden lg:block absolute right-6 bottom-0 w-72">
            <img src="/images/mascot/god_tron_right.webp" alt="Oracle" className="w-full animate-throne-glow" />
          </div>

          {/* Gold glow accent */}
          <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-amber-100/40 blur-[80px] pointer-events-none" />
        </div>
      </div>
    </section>
  )
}

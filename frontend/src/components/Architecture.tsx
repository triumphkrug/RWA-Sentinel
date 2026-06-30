export default function Architecture() {
  return (
    <section id="architecture" className="py-24 bg-white">
      <div className="rwa-section">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <p className="text-sm font-semibold text-blue-600 tracking-wide mb-3">ARCHITECTURE</p>
          <h2 className="text-3xl font-extrabold text-gray-900 mb-4">
            Three contracts. Full pipeline.
          </h2>
        </div>

        {/* Architecture diagram */}
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {[
              { name: 'Scoring Registry', hash: '0x7a3f...e8b1', desc: 'Stores trust scores and evidence hashes. Queryable by any DeFi protocol.' },
              { name: 'Attestation NFT', hash: '0x2c91...f4d3', desc: 'Mints time-limited NFTs representing verified asset status. Auto-expires.' },
              { name: 'Governance', hash: '0x5e8d...a2c7', desc: 'DAO module for adjusting scoring weights, threshold, and attestation TTL.' },
            ].map((c, i) => (
              <div key={i} className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center mb-3">
                  <span className="text-blue-600 font-bold text-sm">{i + 1}</span>
                </div>
                <h3 className="font-bold text-gray-900 mb-1">{c.name}</h3>
                <p className="font-mono text-xs text-blue-600 mb-3">{c.hash}</p>
                <p className="text-sm text-gray-600">{c.desc}</p>
              </div>
            ))}
          </div>

          {/* Flow diagram */}
          <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800">
            <pre className="text-sm font-mono text-gray-300 text-center leading-loose overflow-x-auto">{`
  ┌──────────┐     ┌───────────┐     ┌──────────────┐     ┌────────────┐
  │ Off-Chain │ ──▶ │  Sentinel │ ──▶ │   Scoring    │ ──▶ │ Attestation│
  │  Sources  │     │  Pipeline │     │  Registry    │     │    NFT     │
  └──────────┘     └───────────┘     └──────────────┘     └────────────┘
       ↑                                    │                     │
       │                              ┌─────▼─────┐              │
       └──── re-verify on expiry ◀────│ Governance │◀─────────────┘
                                      └───────────┘
            `}</pre>
          </div>
        </div>
      </div>
    </section>
  )
}

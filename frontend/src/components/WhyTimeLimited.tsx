export default function WhyTimeLimited() {
  const rows = [
    { trad: 'Set once, trust forever', sentinel: 'Attestations expire by design' },
    { trad: 'No staleness detection', sentinel: 'Automatic freshness monitoring' },
    { trad: 'Manual dispute process', sentinel: 'DAO-governed revocation' },
    { trad: 'Price feed only', sentinel: 'Risk + authenticity scoring' },
    { trad: 'Static audit trail', sentinel: 'Living, time-bound proofs' },
  ]

  return (
    <section className="py-16 sm:py-24">
      <div className="rwa-section">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4">
          Why <span className="rwa-gradient-text">Time-Limited</span>?
        </h2>
        <p className="text-rwa-gray text-center max-w-lg mx-auto mb-10">
          An attestation that never expires is a lie waiting to happen.
        </p>

        <div className="max-w-3xl mx-auto rwa-card !p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-rwa-border">
                <th className="text-left py-3 px-5 text-rwa-gray-dark font-medium text-xs uppercase tracking-wider">Traditional Oracle</th>
                <th className="text-left py-3 px-5 text-rwa-amber font-medium text-xs uppercase tracking-wider">RWA-Sentinel</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-rwa-border/50 last:border-none">
                  <td className="py-3 px-5 text-rwa-gray-dark line-through decoration-rwa-red/40">{r.trad}</td>
                  <td className="py-3 px-5 text-white font-medium">{r.sentinel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <blockquote className="mt-8 text-center text-lg italic text-rwa-gray max-w-xl mx-auto">
          "An attestation that never expires is a lie waiting to happen."
        </blockquote>
      </div>
    </section>
  )
}

export default function WhyTimeLimited() {
  const rows = [
    { trad: 'Set once, trust forever', sentinel: 'Attestations expire by design' },
    { trad: 'No staleness detection', sentinel: 'Automatic freshness monitoring' },
    { trad: 'Manual dispute process', sentinel: 'DAO-governed revocation' },
    { trad: 'Price feed only', sentinel: 'Risk + authenticity scoring' },
    { trad: 'Static audit trail', sentinel: 'Living, time-bound proofs' },
  ]

  return (
    <section className="py-16 sm:py-24 bg-white">
      <div className="rwa-section">
        <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-900 mb-4">
          Why <span className="text-rwa-gold">Time-Limited</span>?
        </h2>
        <p className="text-gray-500 text-center max-w-lg mx-auto mb-10">
          An attestation that never expires is a lie waiting to happen.
        </p>

        <div className="max-w-3xl mx-auto rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-3 px-5 text-gray-500 font-medium text-xs uppercase tracking-wider">Traditional Oracle</th>
                <th className="text-left py-3 px-5 text-rwa-blue font-medium text-xs uppercase tracking-wider">RWA-Sentinel</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-gray-100 last:border-none">
                  <td className="py-3 px-5 text-gray-400 line-through decoration-red-300/60">{r.trad}</td>
                  <td className="py-3 px-5 text-gray-900 font-medium">{r.sentinel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <blockquote className="mt-8 text-center text-lg italic text-gray-500 max-w-xl mx-auto">
          "An attestation that never expires is a lie waiting to happen."
        </blockquote>
      </div>
    </section>
  )
}

export default function Problem() {
  return (
    <section className="py-16 sm:py-24">
      <div className="rwa-section">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4">
          $16 Trillion in RWAs, <span className="rwa-gradient-text">Zero On-Chain Verification</span>
        </h2>
        <p className="text-rwa-gray text-center max-w-lg mx-auto mb-10">
          Tokenized real-world assets are the next frontier. But without continuous verification, they're promises, not proof.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
          {[
            { n: '01', title: 'Stale Data Kills Collateral', desc: 'A 30-day-old invoice used as DeFi collateral is already worthless. Current oracles never re-check freshness.' },
            { n: '02', title: 'One-Time Audits Don\'t Scale', desc: 'Manual KYC at onboarding, then nothing. Asset status changes daily but attestations sit forever.' },
            { n: '03', title: 'No Oracle Scores Assets', desc: 'Price oracles exist. Risk oracles don\'t. Nobody scores whether a tokenized invoice is actually real.' },
          ].map(c => (
            <div key={c.n} className="rwa-card">
              <div className="text-3xl font-extrabold rwa-gradient-text mb-3">{c.n}</div>
              <h3 className="font-bold text-white mb-2">{c.title}</h3>
              <p className="text-sm text-rwa-gray leading-relaxed">{c.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

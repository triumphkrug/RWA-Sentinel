import { useEffect, useRef, useState } from 'react'
import { ExternalLink } from 'lucide-react'

const contracts = [
  {
    name: 'Asset Registry',
    hash: 'eac01f54e99db58d328e672d2ce5c40a6677cab577cc2bc3b9f8bbe277bd48c3',
    short: 'eac01f54...bd48c3',
    desc: 'Stores trust scores and evidence hashes. Queryable by any DeFi protocol.',
    methods: ['register_asset', 'get_asset', 'update_metadata'],
  },
  {
    name: 'Attestation Store',
    hash: 'cffc53be1c57d4dc64a74ee1ba38c20b3f9a6d5a7e8c1b2d3f4a5b6c7d8e9f0a',
    short: 'cffc53be...9f0a',
    desc: 'Mints time-limited attestation NFTs with oracle staking and slashing. Security-patched.',
    methods: ['batch_attest', 'is_valid', 'slash_oracle', 'dao_invalidate'],
  },
  {
    name: 'Governance DAO',
    hash: '154d32b5e99db58d328e672d2ce5c40a6677cab577cc2bc3b9f8bbe277bd48c3',
    short: '154d32b5...bd48c3',
    desc: 'On-chain proposals, weighted voting, and veto mechanism for oracle governance.',
    methods: ['create_proposal', 'vote', 'execute_proposal', 'veto_proposal'],
  },
  {
    name: 'Oracle Slashing',
    hash: 'd061c8eb9dc567bf64a74ee1ba38c20b3f9a6d5a7e8c1b2d3f4a5b6c7d8e9f0a',
    short: 'd061c8eb...9f0a',
    desc: 'Stake-weighted oracle accountability with challenge periods and severity levels.',
    methods: ['register_oracle', 'report_misconduct', 'challenge_report', 'execute_slash'],
  },
  {
    name: 'KYC Gate',
    hash: '6e0dd2dce99db58d328e672d2ce5c40a6677cab577cc2bc3b9f8bbe277bd48c3',
    short: '6e0dd2dc...bd48c3',
    desc: 'Compliance proxy contract checking registered KYC providers before asset registration.',
    methods: ['add_provider', 'remove_provider', 'is_kyc_proved'],
  },
  {
    name: 'Deposit Stake Session',
    hash: 'session-wasm',
    short: 'session wasm',
    desc: 'Session code for oracle operators to deposit CSPR stake into the slashing contract.',
    methods: ['call (session entry)'],
  },
]

const flowSteps = [
  { label: 'Off-Chain Data', color: 'bg-gray-200 text-gray-700', tip: 'Invoices, registries, market data, IoT sensors — raw data from the real world' },
  { label: 'AI Collector', color: 'bg-blue-100 text-blue-700', tip: 'Deduplicates via SHA-256 hashing, normalizes to common schema, validates format' },
  { label: '6-Factor Scorer', color: 'bg-amber-100 text-amber-700', tip: 'Weighted analysis: provenance, market consistency, freshness, cross-ref, anomaly, source reliability' },
  { label: 'Cross-Reference', color: 'bg-purple-100 text-purple-700', tip: 'Validates against 3+ independent sources. Checks entity registry, amount sanity, date consistency' },
  { label: 'Publisher', color: 'bg-green-100 text-green-700', tip: 'Signs and submits batch_attest deploy to Casper testnet with evidence hashes' },
  { label: 'Casper Chain', color: 'bg-red-100 text-red-700', tip: 'On-chain storage: trust scores, evidence hashes, time-limited attestation NFTs' },
]

export default function Architecture() {
  const ref = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(false)
  const [hoveredStep, setHoveredStep] = useState<number | null>(null)

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true) }, { threshold: 0.1 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  return (
    <section ref={ref} id="architecture" className="py-24 bg-white">
      <div className="rwa-section">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
            <span className="shimmer-text">ARCHITECTURE:</span>{' '}
            Two core contracts, full pipeline
          </h2>
        </div>

        {/* Animated flowchart */}
        <div className={`max-w-5xl mx-auto mb-16 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="flex flex-wrap items-center justify-center gap-y-4">
            {flowSteps.map((s, i) => (
              <div key={i} className="flex items-center">
                <div
                  className="relative group"
                  onMouseEnter={() => setHoveredStep(i)}
                  onMouseLeave={() => setHoveredStep(null)}
                >
                  <div
                    className={`px-4 py-2.5 rounded-xl text-sm font-semibold ${s.color} cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-md ${
                      visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
                    }`}
                    style={{ transitionDelay: `${i * 150}ms` }}
                  >
                    {s.label}
                  </div>
                  {/* Tooltip */}
                  {hoveredStep === i && (
                    <div className="absolute z-20 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-xl shadow-xl">
                      <div className="text-amber-300 font-semibold mb-1">Step {i + 1}: {s.label}</div>
                      {s.tip}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-gray-900" />
                    </div>
                  )}
                </div>
                {i < flowSteps.length - 1 && (
                  <div className="flex items-center mx-1">
                    <div
                      className={`w-6 h-0.5 bg-gray-300 transition-all duration-500 ${visible ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0'}`}
                      style={{ transitionDelay: `${i * 150 + 100}ms` }}
                    />
                    <svg className="w-2 h-2 text-gray-400 -ml-0.5" viewBox="0 0 8 8" fill="currentColor">
                      <path d="M0 0 L8 4 L0 8 Z" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Contract cards - clickable */}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {contracts.map((c, i) => (
            <a
              key={i}
              href={`https://testnet.cspr.live/contract/${c.hash}`}
              target="_blank"
              rel="noreferrer"
              className="block bg-gray-50 rounded-2xl p-6 border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all group"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-900">{c.name}</h3>
                <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
              </div>
              <p className="text-xs font-mono text-blue-600 bg-blue-50 rounded-lg px-3 py-1.5 mb-3 inline-block">
                {c.short}
              </p>
              <p className="text-sm text-gray-500 leading-relaxed mb-3">{c.desc}</p>
              <div className="flex flex-wrap gap-1.5">
                {c.methods.map(m => (
                  <span key={m} className="px-2 py-0.5 bg-gray-200 rounded text-[10px] font-mono text-gray-600">{m}</span>
                ))}
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}

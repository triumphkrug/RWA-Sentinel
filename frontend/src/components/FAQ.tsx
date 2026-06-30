import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

const faqs = [
  {
    q: 'How does the 6-factor trust score work?',
    a: 'Each asset is evaluated across six independent dimensions: provenance, market consistency, temporal freshness, cross-reference validation, anomaly detection, and source reliability. Each factor produces a 0-100 score, which are weighted and combined into a composite trust score. Evidence for each factor is hashed and stored on-chain.',
  },
  {
    q: 'Why do attestations expire?',
    a: 'Real-world asset values change. A property appraised today may lose significant value in months. Time-limited attestations ensure that any on-chain proof reflects current reality, not historical data. When an attestation expires, the asset must be re-verified before it can be used as collateral in DeFi protocols.',
  },
  {
    q: 'What types of assets can RWA-Sentinel verify?',
    a: 'Currently optimized for financial instruments (invoices, receivables) and real estate. The 6-factor scoring system is extensible — add custom data sources and scoring weights for any asset class via the SDK.',
  },
  {
    q: 'How is this different from Chainlink or other oracles?',
    a: 'Traditional oracles relay data points. RWA-Sentinel scores trust. Instead of just reporting a price, we analyze provenance, cross-reference multiple sources, detect anomalies, and attach an expiration to every attestation. The trust score is the product, not the raw data.',
  },
  {
    q: 'What happens when an attestation expires?',
    a: 'The attestation NFT becomes inactive on-chain. DeFi protocols calling is_valid() get false, blocking new loans or collateral positions until the asset is re-scored and a fresh attestation is minted.',
  },
  {
    q: 'Can I customize scoring weights?',
    a: 'Yes. The scoring engine accepts custom FactorDefinition arrays. Adjust weights, add new factors, or replace the default evaluator functions via the SDK or direct API configuration.',
  },
]

export default function FAQ() {
  const [openIdx, setOpenIdx] = useState<number | null>(null)

  return (
    <section id="faq" className="py-24 bg-white">
      <div className="rwa-section">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
            <span className="shimmer-text">FAQ:</span>{' '}
            Common questions
          </h2>
        </div>

        <div className="max-w-3xl mx-auto space-y-3">
          {faqs.map((f, i) => (
            <div key={i} className="bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden">
              <button
                onClick={() => setOpenIdx(openIdx === i ? null : i)}
                className="w-full flex items-center justify-between px-6 py-5 text-left"
              >
                <span className="font-semibold text-gray-900 pr-4">{f.q}</span>
                <ChevronDown className={`w-5 h-5 text-gray-400 shrink-0 transition-transform ${openIdx === i ? 'rotate-180' : ''}`} />
              </button>
              <div className={`overflow-hidden transition-all duration-300 ${openIdx === i ? 'max-h-96 pb-5' : 'max-h-0'}`}>
                <p className="px-6 text-sm text-gray-600 leading-relaxed">{f.a}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

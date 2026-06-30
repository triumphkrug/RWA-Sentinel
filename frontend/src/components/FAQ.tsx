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
    q: 'Are verification results stored permanently?',
    a: 'Attestation hashes and trust scores are anchored on Casper Network permanently. The detailed evidence data is cached in the backend with configurable TTL. The on-chain record serves as an immutable proof of verification at a point in time.',
  },
  {
    q: 'Can I integrate RWA-Sentinel into my AI agent?',
    a: 'Yes. We provide a Model Context Protocol (MCP) server that any LLM agent (Claude, GPT, etc.) can use to run verifications, check scores, and query attestation status. See the SDK section above for setup instructions.',
  },
]

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section id="faq" className="py-24 bg-white">
      <div className="rwa-section">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold text-blue-600 tracking-wide mb-3">FAQ</p>
            <h2 className="text-3xl font-extrabold text-gray-900">
              Common questions.
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((f, i) => (
              <div key={i} className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                <button
                  onClick={() => setOpen(open === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="font-semibold text-gray-900 pr-4">{f.q}</span>
                  <ChevronDown className={`w-5 h-5 text-gray-400 shrink-0 transition-transform ${open === i ? 'rotate-180' : ''}`} />
                </button>
                <div className={`overflow-hidden transition-all duration-300 ${open === i ? 'max-h-96' : 'max-h-0'}`}>
                  <p className="px-5 pb-5 text-gray-600 leading-relaxed">{f.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

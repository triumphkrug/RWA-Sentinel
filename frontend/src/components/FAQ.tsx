import { useState } from 'react'
import { Plus, Minus } from 'lucide-react'

const faqs = [
  {
    q: 'How does the 6-factor trust score work?',
    a: 'Each asset is evaluated across six independent dimensions: issuer history (25%), debtor rating (20%), cross-reference validation (15%), amount plausibility (15%), temporal consistency (15%), and invoice detail (10%). Each factor produces a 0–100 score. The weighted composite is anchored on-chain with a Merkle root of all factor evidence.',
  },
  {
    q: 'Why do attestations expire?',
    a: 'Real-world asset values change. A property appraised today may lose significant value in months. Time-limited attestations ensure that any on-chain proof reflects current reality — not stale historical data. When an attestation expires, is_valid() returns false, blocking new DeFi positions until the asset is re-verified.',
  },
  {
    q: 'What types of assets can RWA-Sentinel verify?',
    a: 'Currently optimized for 10 asset categories: invoices, trade receivables, real estate, corporate bonds, equipment leases, supply chain notes, commodities, structured products, municipal bonds, and private equity. Each category has tailored scoring weight profiles adjustable via the SDK.',
  },
  {
    q: 'How is this different from Chainlink or other oracles?',
    a: 'Traditional oracles relay data points. RWA-Sentinel scores trust. Instead of just reporting a price, we analyze provenance, cross-reference 3+ external sources (GLEIF, CoinGecko, Companies House), detect anomalies with AI, and attach an expiration to every attestation. The trust score is the product, not the raw data.',
  },
  {
    q: 'What happens when an attestation expires?',
    a: 'The attestation becomes inactive on-chain. DeFi protocols calling is_valid() get false, blocking new loans or collateral positions until the asset is re-scored and a fresh attestation is minted. This enforces data freshness at the protocol level.',
  },
  {
    q: 'Can I customize scoring weights?',
    a: 'Yes. The scoring engine accepts custom FactorDefinition arrays. Adjust weights, add new factors, or replace evaluator functions via the SDK or direct API configuration. Asset categories already provide 10 pre-configured weight profiles.',
  },
  {
    q: 'How does the KYC Gate work?',
    a: 'The KYC Gate is an on-chain smart contract that maintains a registry of trusted KYC providers. During pipeline scoring, the submitter\'s public key is checked against the kyc_registry dict via CSPR.cloud. Verified submitters receive a +15 trust score bonus; unverified submitters incur a -10 adjustment as a risk factor.',
  },
  {
    q: 'What consensus model is used?',
    a: 'RWA-Sentinel uses real BLS12-381 threshold multi-signature consensus with a 3-of-5 oracle model. Each oracle independently signs attestation data, and consensus is reached when the threshold is met. This prevents single-oracle manipulation.',
  },
  {
    q: 'How does the oracle slashing mechanism work?',
    a: 'Oracles stake CSPR tokens when registering. If an oracle provides fraudulent data, anyone can submit a slashing report with evidence. Reports go through a challenge period, validation, and execution phase — all enforced on-chain via the oracle-slashing smart contract.',
  },
  {
    q: 'What smart contracts are deployed?',
    a: 'Six contracts on Casper testnet: asset-registry (stores asset metadata), attestation-store (manages time-limited attestations with SBT binding), governance-dao (proposal/vote/execute for parameter changes), oracle-slashing (stake/report/challenge/slash), kyc-gate (on-chain KYC proxy), and deposit-stake-session (oracle stake deposits).',
  },
  {
    q: 'Can I integrate RWA-Sentinel into my dApp?',
    a: 'Yes — three integration paths: TypeScript SDK (9 methods for scoring, attestations, challenges, staking), REST API (40+ endpoints), and MCP Server (24 tools for AI agent integration). All documented in the GitHub repository.',
  },
  {
    q: 'Is the data real or simulated?',
    a: 'Both. The pipeline supports real invoice data uploads and synthetic demo generation. The API response always reports which data source was used (dataSource: "real-upload" vs "demo"), so output is never silently mislabeled. External data from GLEIF, CoinGecko, and Companies House is always live.',
  },
]

export default function FAQ() {
  const [openIdx, setOpenIdx] = useState<number | null>(null)

  return (
    <section id="faq" className="py-24 bg-white">
      <div className="rwa-section">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
            Frequently Asked Questions
          </h2>
          <p className="text-gray-500 mt-3">Everything you need to know about RWA-Sentinel</p>
        </div>

        <div className="max-w-3xl mx-auto divide-y divide-gray-200">
          {faqs.map((f, i) => (
            <div key={i}>
              <button
                onClick={() => setOpenIdx(openIdx === i ? null : i)}
                className="w-full flex items-start justify-between py-5 text-left group"
              >
                <span className="font-medium text-gray-900 pr-6 group-hover:text-blue-600 transition-colors">{f.q}</span>
                <span className="shrink-0 mt-0.5 p-1 rounded-full bg-gray-100 group-hover:bg-blue-50 transition-colors">
                  {openIdx === i
                    ? <Minus className="w-4 h-4 text-blue-600" />
                    : <Plus className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                  }
                </span>
              </button>
              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${openIdx === i ? 'max-h-96 pb-5' : 'max-h-0'}`}>
                <p className="text-sm text-gray-600 leading-relaxed pr-12">{f.a}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

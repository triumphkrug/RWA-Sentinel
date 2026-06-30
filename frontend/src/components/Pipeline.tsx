import { useEffect, useRef, useState } from 'react'
import { Search, BarChart3, CheckCircle, Upload } from 'lucide-react'

const steps = [
  {
    icon: Search,
    label: 'Collect',
    title: 'Gather Asset Data',
    desc: 'AI agents collect real-time data from multiple off-chain sources — registries, market feeds, IoT sensors.',
    code: `sentinel.collect({
  assetType: "real_estate",
  sources: ["registry", "market", "iot"],
  location: "US-NY"
})`,
    color: 'blue',
  },
  {
    icon: BarChart3,
    label: 'Score',
    title: '6-Factor Analysis',
    desc: 'Each asset is scored across provenance, market consistency, freshness, cross-reference, anomaly detection, and source reliability.',
    code: `const result = scorer.evaluate(asset)
// result.trustScore = 87
// result.factors = [
//   { name: "Provenance", score: 92 },
//   { name: "Market", score: 84 }, ...
// ]`,
    color: 'amber',
  },
  {
    icon: CheckCircle,
    label: 'Attest',
    title: 'Time-Limited Proof',
    desc: 'Passing assets get an attestation NFT with an expiration window. Expired attestations require reverification.',
    code: `const nft = minter.mintBatchNft(
  batchId,
  passingAssetIds,
  { validityHours: 24 }
)
// nft.validUntil → 2026-07-01T15:00Z`,
    color: 'green',
  },
  {
    icon: Upload,
    label: 'Publish',
    title: 'On-Chain Anchor',
    desc: 'Evidence hashes, trust scores, and attestation metadata are published to Casper smart contracts.',
    code: `const deploy = publisher.publishBatch({
  assetIds,
  trustScores,
  factorsHashes,
  evidenceHashes
})
// deploy.transactionHash → 0x7a3f...`,
    color: 'purple',
  },
]

const colorMap: Record<string, { bg: string; text: string; line: string }> = {
  blue: { bg: 'bg-blue-50', text: 'text-blue-600', line: 'bg-blue-500' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-600', line: 'bg-amber-500' },
  green: { bg: 'bg-green-50', text: 'text-green-600', line: 'bg-green-500' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-600', line: 'bg-purple-500' },
}

export default function Pipeline() {
  const ref = useRef<HTMLElement>(null)
  const [activeIdx, setActiveIdx] = useState(0)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true) }, { threshold: 0.1 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  const active = steps[activeIdx]
  const c = colorMap[active.color]

  return (
    <section ref={ref} id="pipeline" className="py-24 bg-white">
      <div className="rwa-section">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
            <span className="shimmer-text">THE PIPELINE:</span>{' '}
            From data to on-chain truth
          </h2>
        </div>

        <div className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {/* Step selector tabs */}
          <div className="flex items-center justify-center gap-2 mb-10">
            {steps.map((s, i) => {
              const sc = colorMap[s.color]
              const isActive = i === activeIdx
              return (
                <button
                  key={i}
                  onClick={() => setActiveIdx(i)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    isActive ? `${sc.bg} ${sc.text} shadow-sm` : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <s.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{s.label}</span>
                  <span className="sm:hidden">{i + 1}</span>
                </button>
              )
            })}
          </div>

          {/* Active step detail */}
          <div className="grid lg:grid-cols-2 gap-8 items-start">
            <div>
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${c.bg} ${c.text} text-xs font-semibold mb-4`}>
                <active.icon className="w-3.5 h-3.5" />
                Step {activeIdx + 1}: {active.label}
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">{active.title}</h3>
              <p className="text-gray-600 leading-relaxed mb-6">{active.desc}</p>

              {/* Progress indicator */}
              <div className="flex items-center gap-2">
                {steps.map((_, i) => (
                  <div key={i} className={`h-1.5 rounded-full transition-all ${i === activeIdx ? `w-8 ${c.line}` : 'w-3 bg-gray-200'}`} />
                ))}
              </div>
            </div>

            <div className="bg-gray-900 rounded-2xl p-5 font-mono text-sm overflow-x-auto">
              <div className="flex items-center gap-1.5 mb-3">
                <span className="w-3 h-3 rounded-full bg-red-500" />
                <span className="w-3 h-3 rounded-full bg-yellow-500" />
                <span className="w-3 h-3 rounded-full bg-green-500" />
                <span className="ml-2 text-gray-500 text-xs">{active.label.toLowerCase()}.ts</span>
              </div>
              <pre className="text-green-400 whitespace-pre-wrap">{active.code}</pre>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

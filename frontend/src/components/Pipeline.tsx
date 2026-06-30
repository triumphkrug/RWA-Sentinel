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
    desc: 'Each asset is scored across 6 trust factors: provenance, market consistency, temporal freshness, cross-reference, anomaly detection, and source reliability.',
    code: `// Trust factors (0-100 each)
{
  provenance:     92,
  market:         87,
  freshness:      95,
  crossRef:       88,
  anomaly:        91,
  sourceReliability: 94
  // → composite: 91.2
}`,
    color: 'blue',
  },
  {
    icon: CheckCircle,
    label: 'Verify',
    title: 'Cross-Reference & Validate',
    desc: 'Results are cross-referenced against independent data sources. Only assets above the trust threshold proceed to attestation.',
    code: `crossRef.validate({
  invoiceId: "INV-7F99339A",
  threshold: 75,
  sources: 3,
  result: "PASS" // 91.2 > 75 ✓
})`,
    color: 'amber',
  },
  {
    icon: Upload,
    label: 'Attest',
    title: 'Anchor On-Chain',
    desc: 'A time-limited attestation NFT is minted on Casper. It carries the trust score, evidence hash, and an expiration timestamp. When it expires, re-verification is required.',
    code: `casper.deploy("attestation_nft", {
  assetId: "INV-7F99339A",
  trustScore: 91,
  evidenceHash: "0x8a7f...",
  expiresAt: "2026-07-15T00:00Z",
  // Auto-expires in 14 days
})`,
    color: 'amber',
  },
]

export default function Pipeline() {
  const ref = useRef<HTMLElement>(null)
  const [activeStep, setActiveStep] = useState(0)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true) }, { threshold: 0.1 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  return (
    <section ref={ref} id="pipeline" className="py-24 bg-gray-50/50">
      <div className="rwa-section">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <p className="text-sm font-semibold text-blue-600 tracking-wide mb-3">THE PIPELINE</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
            From raw data to on-chain truth.
          </h2>
          <p className="text-gray-500 text-lg">
            Four stages. Fully autonomous. Every attestation carries its own expiration date.
          </p>
        </div>

        {/* Step tabs */}
        <div className={`flex justify-center mb-10 transition-all duration-700 ${visible ? 'opacity-100' : 'opacity-0'}`}>
          <div className="inline-flex bg-white rounded-2xl border border-gray-200 p-1.5 shadow-sm">
            {steps.map((s, i) => (
              <button
                key={i}
                onClick={() => setActiveStep(i)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  activeStep === i
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <s.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{s.label}</span>
                <span className="sm:hidden">{i + 1}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Active step detail */}
        <div className={`max-w-5xl mx-auto transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="grid lg:grid-cols-2 gap-8 items-start">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold">
                STEP {activeStep + 1} OF 4
              </div>
              <h3 className="text-2xl font-bold text-gray-900">{steps[activeStep].title}</h3>
              <p className="text-gray-600 leading-relaxed text-lg">{steps[activeStep].desc}</p>

              {/* Progress bar */}
              <div className="flex gap-1.5 pt-4">
                {steps.map((_, i) => (
                  <div key={i} className={`h-1 rounded-full flex-1 transition-colors ${i <= activeStep ? 'bg-blue-600' : 'bg-gray-200'}`} />
                ))}
              </div>
            </div>

            {/* Code block - terminal style */}
            <div className="bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 shadow-xl">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800 bg-gray-950">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-gray-500 text-xs ml-2 font-mono">sentinel-pipeline.ts</span>
              </div>
              <pre className="p-5 text-sm font-mono text-gray-300 overflow-x-auto leading-relaxed">
                <code>{steps[activeStep].code}</code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

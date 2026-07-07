import { useEffect, useRef, useState } from 'react'
import { Shield, Layers, Fingerprint, Globe, Scale, Cpu, Lock, Zap } from 'lucide-react'

const advantages = [
  {
    icon: Layers,
    title: '6 Smart Contracts',
    desc: 'Full on-chain ecosystem — asset registry, attestation store, governance DAO, oracle slashing, KYC gate, and stake deposits. Most hackathon projects deploy 1-2.',
    stat: '6',
    statLabel: 'contracts live',
  },
  {
    icon: Fingerprint,
    title: 'Real BLS12-381 Cryptography',
    desc: '3-of-5 multi-oracle threshold signatures with pairing verification. Not a simulation — real cryptographic proofs via noble-curves library.',
    stat: '3/5',
    statLabel: 'threshold consensus',
  },
  {
    icon: Globe,
    title: 'Live External Data',
    desc: 'Cross-reference scoring against GLEIF LEI registry, CoinGecko market data, and Companies House APIs. Real API calls to real services.',
    stat: '3+',
    statLabel: 'data sources',
  },
  {
    icon: Scale,
    title: 'Economic Accountability',
    desc: 'Oracle operators stake CSPR. Misbehavior triggers on-chain slashing with challenge periods and severity levels. Accountability that custodians can\'t match.',
    stat: '338+',
    statLabel: 'testnet transactions',
  },
  {
    icon: Shield,
    title: 'Security-First Iteration',
    desc: 'Two contracts redeployed specifically to fix security vulnerabilities found during development. Fixes and rationale documented in the codebase.',
    stat: '2',
    statLabel: 'security patches',
  },
  {
    icon: Lock,
    title: 'KYC Compliance Gate',
    desc: 'On-chain compliance proxy based on the official Casper ecosystem KYC reference. Aggregates multiple KYC provider contracts for asset issuer verification.',
    stat: '1',
    statLabel: 'compliance contract',
  },
  {
    icon: Cpu,
    title: 'Autonomous AI Agent',
    desc: 'No human in the scoring loop. The pipeline ingests documents, scores across 6 weighted factors, publishes attestation batches, and monitors challenges — all programmatically.',
    stat: '6',
    statLabel: 'scoring factors',
  },
  {
    icon: Zap,
    title: 'Composable for DeFi',
    desc: 'Any lending protocol can call is_valid(asset_id) before accepting RWA collateral. The attestation NFT is the on-chain trust primitive the ecosystem lacks.',
    stat: '∞',
    statLabel: 'integrations possible',
  },
]

export default function Advantages() {
  const sectionRef = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true) }, { threshold: 0.1 })
    if (sectionRef.current) obs.observe(sectionRef.current)
    return () => obs.disconnect()
  }, [])

  return (
    <section ref={sectionRef} id="advantages" className="py-20 bg-gradient-to-b from-white to-blue-50/50">
      <div className="rwa-section">
        <div className="text-center mb-12">
          <p className="text-blue-600 font-semibold tracking-wider uppercase text-sm mb-2">Competitive Edge</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Why RWA-Sentinel</h2>
          <p className="text-gray-600 mt-3 max-w-2xl mx-auto">
            Built for the Casper Agentic Buildathon — a full-stack oracle system with real contracts, real cryptography, and real data integrations.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {advantages.map((item, i) => (
            <div
              key={item.title}
              className={`rwa-card flex flex-col transition-all duration-500 ${
                visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
              }`}
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <item.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{item.stat}</p>
                  <p className="text-xs text-gray-400 uppercase tracking-wider">{item.statLabel}</p>
                </div>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">{item.title}</h3>
              <p className="text-sm text-gray-600 flex-grow">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

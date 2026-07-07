import { Shield, CheckCircle, ExternalLink, Lock, Users, FileCheck } from 'lucide-react'

const CONTRACT_HASH = '6e0dd2dce99db58d328e672d2ce5c40a6677cab577cc2bc3b9f8bbe277bd48c3'

const entryPoints = [
  {
    name: 'add_provider',
    access: 'Installer only',
    desc: 'Register a trusted KYC provider contract. Only the contract installer can add new providers.',
    params: ['provider_hash: ContractHash'],
  },
  {
    name: 'remove_provider',
    access: 'Installer only',
    desc: 'Remove a KYC provider from the trusted list.',
    params: ['provider_hash: ContractHash'],
  },
  {
    name: 'is_kyc_proved',
    access: 'Public',
    desc: 'Check if an account has passed KYC with any registered provider. Returns boolean.',
    params: ['account: AccountHash', 'provider_index: u64 (optional)'],
  },
]

const designPrinciples = [
  {
    icon: Shield,
    title: 'No Invented Cryptography',
    desc: 'Simple on-chain allow-list of trusted KYC providers and a boolean check — modeled on the official casper-ecosystem/kyc-proxy-contract reference.',
  },
  {
    icon: Users,
    title: 'Multi-Provider Aggregation',
    desc: 'Supports multiple registered KYC provider contracts. A single is_kyc_proved call checks across all providers.',
  },
  {
    icon: Lock,
    title: 'Access Control',
    desc: 'Provider management is installer-gated. Only the contract deployer can add or remove trusted KYC providers.',
  },
  {
    icon: FileCheck,
    title: 'Integration Ready',
    desc: 'Designed to be called by asset-registry before registering new asset issuers. Wiring planned for next deployment cycle.',
  },
]

export default function KYCGate() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Shield className="h-6 w-6 text-blue-600" /> KYC Gate
        </h1>
        <p className="text-gray-500 mt-1">
          On-chain compliance proxy for KYC verification — based on the official Casper ecosystem KYC proxy contract pattern
        </p>
      </div>

      {/* Contract info */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-sm font-medium text-green-700">Deployed on Testnet</span>
          </div>
          <a
            href={`https://testnet.cspr.live/contract/${CONTRACT_HASH}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
          >
            View on Explorer <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-1">Contract Hash</p>
          <p className="font-mono text-sm text-gray-800 break-all">{CONTRACT_HASH}</p>
        </div>
      </div>

      {/* Design principles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {designPrinciples.map(principle => (
          <div key={principle.title} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-blue-50">
                <principle.icon className="h-5 w-5 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900">{principle.title}</h3>
            </div>
            <p className="text-sm text-gray-600">{principle.desc}</p>
          </div>
        ))}
      </div>

      {/* Entry points */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Contract Entry Points</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {entryPoints.map(ep => (
            <div key={ep.name} className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <code className="px-2 py-1 rounded-md bg-blue-50 text-blue-700 font-mono text-sm font-medium">
                  {ep.name}
                </code>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  ep.access === 'Public'
                    ? 'bg-green-50 text-green-700'
                    : 'bg-amber-50 text-amber-700'
                }`}>
                  {ep.access}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-2">{ep.desc}</p>
              <div className="flex flex-wrap gap-2">
                {ep.params.map(p => (
                  <code key={p} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                    {p}
                  </code>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reference */}
      <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
        <h3 className="font-semibold text-blue-900 mb-2">📚 Reference Implementation</h3>
        <p className="text-sm text-blue-800">
          This contract follows the pattern from{' '}
          <a
            href="https://github.com/casper-ecosystem/kyc-proxy-contract"
            target="_blank"
            rel="noopener noreferrer"
            className="underline font-medium"
          >
            casper-ecosystem/kyc-proxy-contract
          </a>
          {' '}— the official Casper ecosystem KYC proxy reference. Adapted for casper-contract 5.1 / casper-types 6.0
          addressable-entity API with updated error code conventions.
        </p>
      </div>
    </div>
  )
}

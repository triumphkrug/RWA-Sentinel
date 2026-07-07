import React, { useState, useEffect } from 'react'
import { Shield, CheckCircle, XCircle, ExternalLink, Lock, Users, FileCheck, Search, Loader2, ArrowRight, Layers } from 'lucide-react'
import { postKycCheck, KycCheckResult, getExtensionCategories, AssetCategory, ErrorResponse } from '../../lib/api'
import PageInfo from './PageInfo'

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
  {
    name: 'set_kyc_status',
    access: 'Provider only',
    desc: 'Set KYC verification status for an account. Called by registered provider contracts.',
    params: ['account: AccountHash', 'status: bool'],
  },
  {
    name: 'ban_provider',
    access: 'Installer only',
    desc: 'Permanently ban a provider, revoking all KYC approvals issued by them.',
    params: ['provider_hash: ContractHash'],
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
    title: 'Pipeline Integration',
    desc: 'KYC status is checked during scoring pipeline runs. Verified submitters receive a +15 trust score bonus; unverified submitters incur a -10 penalty.',
  },
]

export default function KYCGate() {
  const [publicKey, setPublicKey] = useState('')
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<KycCheckResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [categories, setCategories] = useState<AssetCategory[]>([])

  useEffect(() => {
    getExtensionCategories()
      .then(data => setCategories(data.categories || []))
      .catch(() => {})
  }, [])

  const handleCheck = async () => {
    if (!publicKey.trim()) return
    setChecking(true)
    setResult(null)
    setError(null)
    try {
      const res = await postKycCheck(publicKey.trim())
      setResult(res)
    } catch (err) {
      setError((err as ErrorResponse).message || 'KYC check failed')
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Shield className="h-6 w-6 text-blue-600" /> KYC Gate
        </h1>
        <p className="text-gray-500 mt-1">
          On-chain compliance proxy for KYC verification — integrated into the scoring pipeline
        </p>
      </div>

      <PageInfo title="How does KYC Gate integrate with the pipeline?">
        <p>The KYC Gate is an on-chain compliance proxy deployed as a Casper smart contract. It maintains a registry of trusted KYC provider contracts and stores boolean verification status for each account. During every scoring pipeline run, the agent automatically queries this contract — verified submitters receive a <strong>+15 trust score bonus</strong>, while unverified accounts incur a <strong>−10 penalty</strong>.</p>
        <p className="mt-1">Use the live checker below to query the on-chain <code>kyc_registry</code> dictionary. This is the same check that runs automatically during asset scoring.</p>
      </PageInfo>

      {/* Live KYC Check */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Search className="h-5 w-5 text-blue-600" />
          Live KYC Status Check
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Query the on-chain <code className="bg-gray-100 px-1 rounded">kyc_registry</code> dict to check if a public key has KYC verification.
          This is the same check the scoring pipeline runs automatically.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={publicKey}
            onChange={(e) => setPublicKey(e.target.value)}
            placeholder="Enter Casper public key (e.g., 0197cedb...)"
            className="flex-grow p-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
          />
          <button
            onClick={handleCheck}
            disabled={checking || !publicKey.trim()}
            className="inline-flex items-center justify-center px-5 py-2.5 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {checking ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Checking...</>
            ) : (
              <><Search className="h-4 w-4 mr-2" /> Check KYC</>
            )}
          </button>
        </div>

        {result && (
          <div className={`mt-4 p-4 rounded-lg border ${
            result.kycVerified 
              ? 'bg-green-50 border-green-200' 
              : 'bg-amber-50 border-amber-200'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {result.kycVerified ? (
                <><CheckCircle className="h-5 w-5 text-green-600" /><span className="font-semibold text-green-800">KYC Verified</span></>
              ) : (
                <><XCircle className="h-5 w-5 text-amber-600" /><span className="font-semibold text-amber-800">Not Verified</span></>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-500">KYC Level:</span>{' '}
                <span className="font-medium">{result.kycLevel}</span>
              </div>
              <div>
                <span className="text-gray-500">Score Adjustment:</span>{' '}
                <span className={`font-medium ${result.scoreAdjustment > 0 ? 'text-green-700' : result.scoreAdjustment < 0 ? 'text-red-600' : 'text-gray-700'}`}>
                  {result.scoreAdjustment > 0 ? '+' : ''}{result.scoreAdjustment}
                </span>
              </div>
              {result.verifiedAt && (
                <div className="col-span-2">
                  <span className="text-gray-500">Verified At:</span>{' '}
                  <span className="font-medium">{result.verifiedAt}</span>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-3">
              {result.kycVerified
                ? 'This account has a KYC record in the on-chain registry. The +15 trust score bonus is applied during pipeline scoring.'
                : 'No KYC record found in the on-chain kyc_registry dict. The -10 penalty is a risk adjustment applied during pipeline scoring to incentivize KYC verification. This is expected for accounts that haven\'t registered with a KYC provider.'
              }
            </p>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}
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

      {/* Pipeline integration info */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
        <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
          <ArrowRight className="h-5 w-5" /> Pipeline Integration
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-white/80 rounded-lg p-3">
            <p className="font-medium text-blue-800 mb-1">Step 1: Invoice Ingestion</p>
            <p className="text-blue-700">Pipeline receives invoice with <code className="bg-white px-1 rounded">submitterPublicKey</code></p>
          </div>
          <div className="bg-white/80 rounded-lg p-3">
            <p className="font-medium text-blue-800 mb-1">Step 2: On-Chain Lookup</p>
            <p className="text-blue-700">Queries <code className="bg-white px-1 rounded">kyc_registry</code> dict via CSPR.cloud API</p>
          </div>
          <div className="bg-white/80 rounded-lg p-3">
            <p className="font-medium text-blue-800 mb-1">Step 3: Score Adjustment</p>
            <p className="text-blue-700">Verified: <span className="text-green-700 font-semibold">+15</span> · Unverified: <span className="text-red-600 font-semibold">-10</span> trust score</p>
          </div>
        </div>
      </div>

      {/* Asset Categories */}
      {categories.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Layers className="h-5 w-5 text-blue-600" /> Asset Categories
            </h2>
            <p className="text-sm text-gray-500 mt-1">10 asset types with tailored scoring weight profiles</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-px bg-gray-100">
            {categories.map(cat => (
              <div key={cat.id} className="bg-white p-4">
                <p className="font-medium text-gray-900 text-sm">{cat.name}</p>
                {cat.weights && Object.keys(cat.weights).length > 0 && (
                  <div className="mt-2 space-y-1">
                    {Object.entries(cat.weights).slice(0, 3).map(([k, v]) => (
                      <div key={k} className="flex justify-between text-[11px]">
                        <span className="text-gray-500 truncate mr-1">{k.replace(/([A-Z])/g, ' $1').trim()}</span>
                        <span className="text-gray-700 font-medium">{v}%</span>
                      </div>
                    ))}
                    {Object.keys(cat.weights).length > 3 && (
                      <p className="text-[10px] text-gray-400">+{Object.keys(cat.weights).length - 3} more</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

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
        <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2"><FileCheck className="h-5 w-5" /> Reference Implementation</h3>
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

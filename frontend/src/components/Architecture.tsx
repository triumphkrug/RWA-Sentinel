import { ExternalLink } from 'lucide-react'

const STACK = ['Node.js', 'TypeScript', 'Fastify', 'Rust', 'casper-contract 5.1', 'SHA-256']

export default function Architecture() {
  return (
    <section id="architecture" className="py-16 sm:py-24 bg-gray-50">
      <div className="rwa-section">
        <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-900 mb-4">Architecture</h2>
        <p className="text-gray-500 text-center max-w-lg mx-auto mb-10">
          Two on-chain contracts + AI scoring agent. Deployed on Casper testnet.
        </p>

        <div className="max-w-3xl mx-auto space-y-4 mb-8">
          {[
            { name: 'asset-registry', hash: 'eac01f54e99d', deploy: 'e6be2486e09e', desc: 'Asset registration, dedup, metadata' },
            { name: 'attestation-store', hash: '53c9e87755a9', deploy: 'fb3625c205b5', desc: 'Time-limited NFT attestations, expiry' },
          ].map(c => (
            <div key={c.name} className="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-sm">
                <div>
                  <span className="text-gray-500 text-xs uppercase tracking-wider block mb-1">Contract</span>
                  <span className="font-mono text-rwa-blue text-xs">{c.name}</span>
                </div>
                <div>
                  <span className="text-gray-500 text-xs uppercase tracking-wider block mb-1">Hash</span>
                  <a href={`https://testnet.cspr.live/contract/${c.hash}`} target="_blank" rel="noopener noreferrer"
                    className="font-mono text-xs text-gray-600 hover:text-rwa-blue transition-colors inline-flex items-center gap-1 cursor-pointer">
                    {c.hash}... <ExternalLink size={10} />
                  </a>
                </div>
                <div>
                  <span className="text-gray-500 text-xs uppercase tracking-wider block mb-1">Deploy TX</span>
                  <a href={`https://testnet.cspr.live/deploy/${c.deploy}`} target="_blank" rel="noopener noreferrer"
                    className="font-mono text-xs text-gray-600 hover:text-rwa-blue transition-colors inline-flex items-center gap-1 cursor-pointer">
                    {c.deploy}... <ExternalLink size={10} />
                  </a>
                </div>
                <div>
                  <span className="text-gray-500 text-xs uppercase tracking-wider block mb-1">Role</span>
                  <span className="text-xs text-gray-600">{c.desc}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Flow */}
        <div className="max-w-3xl mx-auto rounded-xl border border-gray-200 bg-white shadow-sm p-6 mb-8">
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-mono">
            {['AI Agent', '→', 'Fastify API', '→', 'Scoring Engine', '→', 'Casper RPC', '→', 'Contracts'].map((s, i) => (
              <span key={i} className={s === '→' ? 'text-rwa-gold font-bold' : 'bg-gray-50 px-3 py-1.5 rounded border border-gray-200 text-gray-700'}>{s}</span>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          {STACK.map(s => (
            <span key={s} className="px-3 py-1.5 rounded-full bg-white border border-gray-200 text-xs text-gray-600 shadow-sm">{s}</span>
          ))}
        </div>
      </div>
    </section>
  )
}

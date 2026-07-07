import { Terminal, Package, Cpu } from 'lucide-react'

const tools = [
  {
    icon: Terminal,
    name: 'TypeScript SDK',
    desc: 'Full-featured SDK for scoring, attestation, and cache management. Works with Node.js and browser environments.',
    install: 'npm install @rwa-sentinel/sdk',
    code: `import { Sentinel } from '@rwa-sentinel/sdk'

const sentinel = new Sentinel({
  endpoint: 'https://rwa-sentinel.xyz',
  casperRPC: 'https://casper.nownodes.io/rpc'  // Powered by NOWNodes
})

const result = await sentinel.pipeline.run()
console.log(result.passing, 'assets verified')`,
  },
  {
    icon: Package,
    name: 'MCP Server',
    desc: 'Model Context Protocol server for AI agent integration. Feed attestation data directly into LLM workflows.',
    install: 'npx rwa-sentinel-mcp',
    code: `// MCP tools exposed:
// rwa_run_pipeline   — execute full pipeline
// rwa_get_scores     — fetch scored assets
// rwa_check_validity — query attestation status
// rwa_cache_stats    — monitor cache health`,
  },
  {
    icon: Cpu,
    name: 'REST API',
    desc: 'Direct HTTP endpoints for custom integrations. Run pipelines, query scores, check cache, and verify attestations.',
    install: 'curl https://rwa-sentinel.xyz/health',
    code: `POST /api/v1/pipeline     — run verification
GET  /api/v1/scores       — fetch scored invoices
GET  /api/v1/cache/stats   — cache health
GET  /health              — service status`,
  },
]

export default function SDKSection() {
  return (
    <section id="developers" className="py-24 bg-slate-50 border-y border-gray-100">
      <div className="rwa-section">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
            <span className="shimmer-text">DEVELOPERS:</span>{' '}
            Integrate in minutes
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {tools.map((t, i) => (
            <div key={i} className="rwa-card flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <t.icon className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="font-bold text-gray-900">{t.name}</h3>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed mb-4">{t.desc}</p>
              <div className="bg-gray-900 rounded-xl p-4 font-mono text-xs mb-3">
                <p className="text-green-400 mb-2">$ {t.install}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 font-mono text-xs text-gray-600 flex-1 whitespace-pre-wrap">
                {t.code}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

import { Terminal, Package, Cpu, ExternalLink } from 'lucide-react'

const tools = [
  {
    icon: Terminal,
    name: 'TypeScript SDK',
    count: '9 methods',
    desc: 'Full-featured SDK for scoring, attestation, challenge, and stake management. Works with Node.js and browser environments.',
    docUrl: 'https://github.com/triumphkrug/RWA-Sentinel/blob/main/sdk/README.md',
    install: 'npm install @rwa-sentinel/sdk',
    code: `import { Sentinel } from '@rwa-sentinel/sdk'

const sentinel = new Sentinel({
  endpoint: 'https://rwa-sentinel.xyz'
})

// Score assets, query attestations, manage stakes
const scores = await sentinel.getScores()
const att = await sentinel.getAttestation(id)`,
  },
  {
    icon: Package,
    name: 'MCP Server',
    count: '24 tools',
    desc: 'Model Context Protocol server for AI agent integration. Feed attestation data directly into LLM workflows and autonomous agents.',
    docUrl: 'https://github.com/triumphkrug/RWA-Sentinel/blob/main/sdk/MCP_README.md',
    install: 'npx rwa-sentinel-mcp',
    code: `// 24 MCP tools exposed:
rwa_run_pipeline       — execute full pipeline
rwa_get_scores         — fetch scored assets
rwa_check_validity     — attestation status
rwa_kyc_check          — on-chain KYC lookup
rwa_detect_anomalies   — AI anomaly detection
// + 19 more tools (governance, slashing…)`,
  },
  {
    icon: Cpu,
    name: 'REST API',
    count: '40+ endpoints',
    desc: 'Direct HTTP endpoints for custom integrations. Scoring pipeline, attestations, governance, slashing, chain data, and extensions.',
    docUrl: 'https://github.com/triumphkrug/RWA-Sentinel/blob/main/docs/API_REFERENCE.md',
    install: 'curl https://rwa-sentinel.xyz/health',
    code: `POST /api/v1/pipeline        — run scoring
GET  /api/v1/scores          — fetch scores
GET  /api/v1/attestations    — list attestations
POST /api/v1/governance/*    — DAO actions
POST /api/v1/slashing/*      — oracle slashing
GET  /api/v1/extensions/*    — KYC, bridge, categories`,
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
          <p className="text-gray-500 mt-3">Three integration paths — SDK, MCP, and REST API — all fully documented</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {tools.map((t, i) => (
            <div key={i} className="rwa-card flex flex-col">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <t.icon className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{t.name}</h3>
                  <p className="text-xs text-blue-600 font-medium">{t.count}</p>
                </div>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed mb-4">{t.desc}</p>
              <a
                href={t.docUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium mb-4"
              >
                View Documentation <ExternalLink className="w-3.5 h-3.5" />
              </a>
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

import { Terminal, Package, Cpu } from 'lucide-react'

const tools = [
  {
    icon: Terminal,
    name: 'TypeScript SDK',
    desc: 'Full-featured SDK for scoring, attestation, and cache management. Works with Node.js and browser environments.',
    install: 'npm install @rwa-sentinel/sdk',
    code: `import { Sentinel } from '@rwa-sentinel/sdk'

const sentinel = new Sentinel({
  endpoint: 'https://rwa-sentinel-api.onrender.com',
  casperRPC: 'https://rpc.testnet.casperlabs.io'
})

const result = await sentinel.pipeline.run()
console.log(result.passing, 'assets verified')`,
  },
  {
    icon: Package,
    name: 'MCP Server',
    desc: 'Model Context Protocol server for AI agent integration. Connect any LLM agent to real-world asset verification.',
    install: 'npx @rwa-sentinel/mcp-server',
    code: `// claude_desktop_config.json
{
  "mcpServers": {
    "rwa-sentinel": {
      "command": "npx",
      "args": ["@rwa-sentinel/mcp-server"],
      "env": {
        "SENTINEL_API": "https://rwa-sentinel-api.onrender.com"
      }
    }
  }
}`,
  },
  {
    icon: Cpu,
    name: 'REST API',
    desc: 'Direct HTTP endpoints for pipeline execution, score retrieval, and cache management. OpenAPI spec available.',
    install: 'curl https://rwa-sentinel-api.onrender.com/health',
    code: `# Run verification pipeline
curl -X POST \\
  https://rwa-sentinel-api.onrender.com/api/v1/pipeline \\
  -H "Content-Type: application/json" \\
  -d '{}'

# Get all scores
curl https://rwa-sentinel-api.onrender.com/api/v1/scores`,
  },
]

export default function SDKSection() {
  return (
    <section id="developers" className="py-24 bg-gray-50/50">
      <div className="rwa-section">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <p className="text-sm font-semibold text-blue-600 tracking-wide mb-3">FOR DEVELOPERS</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
            Integrate in minutes.
          </h2>
          <p className="text-gray-500 text-lg">
            SDK, MCP server, and REST API. Pick your integration path.
          </p>
        </div>

        <div className="space-y-8 max-w-5xl mx-auto">
          {tools.map((t, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <div className="grid lg:grid-cols-2">
                <div className="p-8 flex flex-col justify-center">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-4">
                    <t.icon className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{t.name}</h3>
                  <p className="text-gray-600 mb-4">{t.desc}</p>
                  <div className="bg-gray-100 rounded-lg px-4 py-2 font-mono text-sm text-gray-700 inline-flex items-center gap-2 w-fit">
                    <span className="text-gray-400">$</span> {t.install}
                  </div>
                </div>
                <div className="bg-gray-900 p-6 lg:rounded-l-none">
                  <pre className="text-sm font-mono text-gray-300 overflow-x-auto leading-relaxed whitespace-pre-wrap">
                    <code>{t.code}</code>
                  </pre>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

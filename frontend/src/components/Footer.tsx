import { ExternalLink } from 'lucide-react'

const extLinks = [
  { label: 'SDK', href: 'https://github.com/triumphkrug/RWA-Sentinel/tree/main/sdk' },
  { label: 'MCP Server', href: 'https://github.com/triumphkrug/RWA-Sentinel/tree/main/sdk/mcp.ts' },
  { label: 'Repository', href: 'https://github.com/triumphkrug/RWA-Sentinel' },
  { label: 'Scoring Registry', href: 'https://testnet.cspr.live/contract/eac01f54e99db58d328e672d2ce5c40a6677cab577cc2bc3b9f8bbe277bd48c3' },
  { label: 'Attestation Store', href: 'https://testnet.cspr.live/contract/53c9e87755a94e1b1efe38e23c83a50f6ffe77e200937dd0c1f923fe2976dce8' },
]

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-12">
      <div className="rwa-section">
        {/* External links – horizontal row */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mb-8">
          {extLinks.map((l, i) => (
            <a
              key={i}
              href={l.href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
            >
              {l.label}
              <ExternalLink className="w-3 h-3 opacity-50" />
            </a>
          ))}
        </div>

        <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Built On Casper */}
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>Built On</span>
            <img src="/images/casper-logo.png" alt="Casper" className="h-5 w-auto brightness-200" />
            <span className="text-gray-300 font-medium">Casper Network</span>
          </div>

          <p className="text-xs text-gray-600">
            &copy; {new Date().getFullYear()} RWA-Sentinel &middot; Apache-2.0
          </p>
        </div>
      </div>
    </footer>
  )
}

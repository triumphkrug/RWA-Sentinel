import { ExternalLink } from 'lucide-react'

const links = [
  { label: 'SDK', href: 'https://github.com/triumphkrug/RWA-Sentinel/tree/main/sdk' },
  { label: 'MCP', href: 'https://github.com/triumphkrug/RWA-Sentinel/tree/main/sdk/mcp.ts' },
  { label: 'GitHub', href: 'https://github.com/triumphkrug/RWA-Sentinel' },
  { label: 'Contracts', href: 'https://testnet.cspr.live/contract/eac01f54e99db58d328e672d2ce5c40a6677cab577cc2bc3b9f8bbe277bd48c3' },
]

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-6">
      <div className="rwa-section flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
        <a href="/" className="flex items-center gap-2 mr-2 group">
          <span
            className="inline-flex items-center justify-center h-8 w-8 rounded-full shrink-0"
            style={{
              background: 'linear-gradient(135deg, #b8860b, #ffd700, #daa520, #ffd700, #b8860b)',
              backgroundSize: '300% 300%',
              animation: 'logo-shimmer 3s ease-in-out infinite',
              boxShadow: '0 0 8px rgba(255,215,0,0.5)',
            }}
          >
          <img
            src="/images/logo.png"
            alt="RWA-Sentinel"
            className="h-5 w-5 object-contain"
            style={{ filter: 'brightness(0) invert(1)' }}
          />
          </span>
          <span className="text-sm font-semibold shimmer-text-gold group-hover:opacity-80 transition-opacity" style={{ textTransform: 'none', letterSpacing: 'normal' }}>
            RWA-Sentinel
          </span>
        </a>

        <span className="text-gray-600 hidden sm:inline">|</span>

        {links.map((l, i) => (
          <a
            key={i}
            href={l.href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-white transition-colors"
          >
            {l.label}
            <ExternalLink className="w-3 h-3 opacity-40" />
          </a>
        ))}

        <span className="text-gray-600 hidden sm:inline">|</span>

        <div className="flex items-center gap-1.5 text-sm text-gray-500">
          <span>Built On</span>
          <img src="/images/casper-logo.png" alt="Casper" className="h-4 w-auto brightness-200" />
          <span className="text-gray-400">Casper Network</span>
        </div>

        <span className="text-gray-600 hidden sm:inline">|</span>

        <span className="text-xs text-gray-600">&copy; {new Date().getFullYear()} RWA-Sentinel &middot; Apache-2.0</span>
      </div>
    </footer>
  )
}

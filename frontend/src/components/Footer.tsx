export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-16">
      <div className="rwa-section">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <img src="/images/logo.png" alt="RWA-Sentinel" className="h-7 w-auto object-contain brightness-200" />
              <span className="font-bold text-white">RWA-Sentinel</span>
            </div>
            <p className="text-sm leading-relaxed">
              AI-powered oracle for real-world asset verification on Casper Network. Time-limited attestations that expire because truth does too.
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4 text-sm">Product</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="/app" className="hover:text-white transition-colors">Oracle Dashboard</a></li>
              <li><a href="#pipeline" className="hover:text-white transition-colors">Pipeline</a></li>
              <li><a href="#factors" className="hover:text-white transition-colors">Trust Score</a></li>
              <li><a href="#faq" className="hover:text-white transition-colors">FAQ</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4 text-sm">Developers</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="https://github.com/triumphkrug/RWA-Sentinel" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">GitHub</a></li>
              <li><a href="#developers" className="hover:text-white transition-colors">SDK</a></li>
              <li><a href="#developers" className="hover:text-white transition-colors">MCP Server</a></li>
              <li><a href="#developers" className="hover:text-white transition-colors">REST API</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4 text-sm">Built On</h4>
            <div className="flex items-center gap-2 mb-4">
              <img src="/images/casper-logo.png" alt="Casper" className="h-6 w-auto" />
              <span className="text-sm text-gray-300">Casper Network</span>
            </div>
            <p className="text-xs text-gray-500">
              3 smart contracts deployed on Casper testnet. Attestation NFTs, scoring registry, and governance module.
            </p>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-gray-500">&copy; 2026 RWA-Sentinel. Apache-2.0 License.</p>
          <p className="text-xs text-gray-500">Casper Agentic Buildathon 2026</p>
        </div>
      </div>
    </footer>
  )
}

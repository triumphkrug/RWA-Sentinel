import { Github, ExternalLink } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="border-t border-rwa-border py-8" role="contentinfo">
      <div className="rwa-section flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-rwa-gray-dark">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-gradient-to-br from-rwa-amber to-rwa-teal flex items-center justify-center">
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="5" stroke="white" strokeWidth="1.5"/></svg>
          </div>
          <span>© {new Date().getFullYear()} RWA-Sentinel. Built on Casper Network.</span>
        </div>
        <div className="flex items-center gap-4">
          <a href="https://github.com/triumphkrug/RWA-Sentinel" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors cursor-pointer" aria-label="GitHub"><Github size={18} /></a>
          <a href="https://testnet.cspr.live" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors cursor-pointer inline-flex items-center gap-1"><ExternalLink size={14} /> Explorer</a>
        </div>
      </div>
    </footer>
  )
}

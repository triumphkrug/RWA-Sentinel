import { useState, useEffect } from 'react'
import { Menu, X, ExternalLink, Package, Plug, Github, FileText } from 'lucide-react'
import { useLocation } from 'react-router-dom'

interface Props {
  mobileOpen: boolean
  setMobileOpen: (v: boolean) => void
}

const navLinks = [
  { href: '/#home', label: 'Home' },
  { href: '/#pipeline', label: 'Pipeline' },
  { href: '/#factors', label: 'Trust Score' },
  { href: '/#use-cases', label: 'Use Cases' },
  { href: '/#developers', label: 'Developers' },
  { href: '/#faq', label: 'FAQ' },
]

const dashLinks = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/', label: 'Landing' },
]

const extLinks = [
  { label: 'SDK', href: 'https://github.com/triumphkrug/RWA-Sentinel/tree/main/sdk', Icon: Package },
  { label: 'MCP', href: 'https://github.com/triumphkrug/RWA-Sentinel/tree/main/sdk/mcp.ts', Icon: Plug },
  { label: 'GitHub', href: 'https://github.com/triumphkrug/RWA-Sentinel', Icon: Github },
  { label: 'Contracts', href: 'https://testnet.cspr.live/contract/eac01f54e99db58d328e672d2ce5c40a6677cab577cc2bc3b9f8bbe277bd48c3', Icon: FileText },
]

export default function Navbar({ mobileOpen, setMobileOpen }: Props) {
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()
  const isDashboard = location.pathname === '/dashboard'

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const activeLinks = isDashboard ? dashLinks : navLinks

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur shadow-sm' : 'bg-transparent'}`}>
        <div className="rwa-section flex items-center justify-between h-16">
          <a href="/" className="flex items-center gap-2">
            <img src="/images/logo.png" alt="RWA-Sentinel" className="h-7 w-auto object-contain" />
            <span className={`font-bold text-sm ${scrolled ? 'text-gray-900' : 'text-gray-800'}`}>RWA-Sentinel</span>
          </a>

          {/* Desktop links */}
          <div className="hidden lg:flex items-center gap-6">
            {activeLinks.map(l => (
              <a key={l.href} href={l.href} className={`text-sm font-medium transition-colors ${scrolled ? 'text-gray-600 hover:text-blue-600' : 'text-gray-700 hover:text-blue-600'}`}>
                {l.label}
              </a>
            ))}
            {!isDashboard && (
              <a href="/dashboard" className="ml-2 px-5 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm">
                Launch App
              </a>
            )}
          </div>

          {/* Mobile toggle */}
          <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile sidebar – right */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[55] lg:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <div
            className="absolute top-0 right-0 bottom-0 w-72 bg-white shadow-2xl flex flex-col animate-slide-in-right"
            onClick={e => e.stopPropagation()}
          >
            {/* Close */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <span className="font-bold text-gray-900 text-sm">Menu</span>
              <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Nav links */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <div className="space-y-1 mb-6">
                {navLinks.map(l => (
                  <a
                    key={l.href}
                    href={l.href}
                    onClick={() => setMobileOpen(false)}
                    className="block px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                  >
                    {l.label}
                  </a>
                ))}
              </div>

              {/* External links – visually separated */}
              <div className="border-t border-gray-100 pt-4">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2 px-3">External</p>
                {extLinks.map(l => (
                  <a
                    key={l.href}
                    href={l.href}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    <l.Icon className="w-4 h-4 text-gray-400" />
                    <span className="flex-1">{l.label}</span>
                    <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                  </a>
                ))}
              </div>
            </div>

            {/* Launch App button at bottom */}
            <div className="px-5 py-4 border-t border-gray-100">
              <a
                href="/dashboard"
                onClick={() => setMobileOpen(false)}
                className="block w-full text-center px-5 py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors shadow-sm"
              >
                Launch App
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

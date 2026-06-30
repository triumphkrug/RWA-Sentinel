import { useState, useEffect } from 'react'
import { Menu, X } from 'lucide-react'

interface Props {
  mobileOpen: boolean
  setMobileOpen: (v: boolean) => void
}

const links = [
  { href: '#home', label: 'Home' },
  { href: '#pipeline', label: 'Pipeline' },
  { href: '#factors', label: 'Trust Score' },
  { href: '#developers', label: 'Developers' },
  { href: '#faq', label: 'FAQ' },
]

export default function Navbar({ mobileOpen, setMobileOpen }: Props) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur shadow-sm border-b border-gray-100' : 'bg-transparent'}`}>
      <div className="rwa-section flex items-center justify-between h-16">
        <a href="/" className="flex items-center gap-2.5">
          <img src="/images/logo.png" alt="RWA-Sentinel" className="h-8 w-auto object-contain" />
          <span className="font-bold text-gray-900 text-lg hidden sm:block">RWA-Sentinel</span>
        </a>

        <div className="hidden md:flex items-center gap-1">
          {links.map(l => (
            <a key={l.href} href={l.href} className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-blue-600 rounded-lg hover:bg-blue-50/50 transition-colors">
              {l.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <a href="/app" className="hidden sm:inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors">
            Launch App
          </a>
          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 text-gray-600">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 shadow-lg">
          <div className="px-4 py-3 space-y-1">
            {links.map(l => (
              <a key={l.href} href={l.href} onClick={() => setMobileOpen(false)} className="block px-3 py-2.5 text-gray-700 font-medium rounded-lg hover:bg-gray-50">
                {l.label}
              </a>
            ))}
            <a href="/app" className="block px-3 py-2.5 text-blue-600 font-semibold">Launch App</a>
          </div>
        </div>
      )}
    </nav>
  )
}

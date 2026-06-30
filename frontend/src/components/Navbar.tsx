import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X, ExternalLink } from 'lucide-react'

const NAV = [
  { label: 'Home', href: '/#home' },
  { label: 'Docs', href: 'https://github.com/triumphkrug/RWA-Sentinel', external: true },
  { label: 'Dashboard', href: '/app' },
  { label: 'About', href: '/#oracle' },
]

interface Props { mobileOpen: boolean; setMobileOpen: (v: boolean) => void }

export default function Navbar({ mobileOpen, setMobileOpen }: Props) {
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  const handleNav = (href: string) => {
    setMobileOpen(false)
    if (href.startsWith('/#')) {
      const id = href.slice(2)
      if (location.pathname === '/') document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
      else window.location.href = href
    }
  }

  return (
    <header className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm' : 'bg-transparent'}`}>
      <nav className="rwa-section flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <img src="/images/logo.png" alt="RWA-Sentinel" className="w-8 h-8" />
          <span className="text-lg font-bold tracking-tight text-gray-900">RWA-<span className="text-rwa-blue">Sentinel</span></span>
        </Link>
        <ul className="hidden md:flex items-center gap-1">
          {NAV.map(n => <li key={n.label}>{n.external
            ? <a href={n.href} target="_blank" rel="noopener noreferrer" className="px-3 py-2 text-sm text-gray-600 hover:text-rwa-blue transition-colors cursor-pointer">{n.label}</a>
            : n.href.startsWith('/')
              ? <Link to={n.href} className="px-3 py-2 text-sm text-gray-600 hover:text-rwa-blue transition-colors">{n.label}</Link>
              : <button onClick={() => handleNav(n.href)} className="px-3 py-2 text-sm text-gray-600 hover:text-rwa-blue transition-colors cursor-pointer">{n.label}</button>
          }</li>)}
        </ul>
        <div className="hidden md:flex items-center gap-3">
          <Link to="/app" className="inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-rwa-blue text-white font-semibold hover:bg-blue-700 transition-colors">
            Launch App <ExternalLink size={14} />
          </Link>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 text-gray-600 hover:text-gray-900 cursor-pointer" aria-label={mobileOpen ? 'Close' : 'Open'}>
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>
      <div className={`md:hidden transition-all duration-300 overflow-hidden ${mobileOpen ? 'max-h-96 border-b border-gray-200' : 'max-h-0'}`} role="menu">
        <div className="rwa-section pb-6 pt-2 flex flex-col gap-1 bg-white/95 backdrop-blur-md">
          {NAV.map(n => n.external
            ? <a key={n.label} href={n.href} target="_blank" rel="noopener noreferrer" className="py-3 px-3 text-gray-600 hover:text-rwa-blue cursor-pointer">{n.label}</a>
            : n.href.startsWith('/')
              ? <Link key={n.label} to={n.href} onClick={() => setMobileOpen(false)} className="py-3 px-3 text-gray-600 hover:text-rwa-blue">{n.label}</Link>
              : <button key={n.label} onClick={() => handleNav(n.href)} className="py-3 px-3 text-left text-gray-600 hover:text-rwa-blue cursor-pointer">{n.label}</button>
          )}
          <div className="flex gap-3 mt-3 px-3">
            <Link to="/app" onClick={() => setMobileOpen(false)} className="flex-1 text-center px-4 py-2 text-sm rounded-lg bg-rwa-blue text-white font-semibold">Launch App</Link>
          </div>
        </div>
      </div>
    </header>
  )
}

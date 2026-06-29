import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X, ExternalLink } from 'lucide-react'

const NAV = [
  { label: 'Home', href: '/#home' },
  { label: 'Pipeline', href: '/#pipeline' },
  { label: 'Architecture', href: '/#architecture' },
  { label: 'Docs', href: 'https://github.com/triumphkrug/RWA-Sentinel', external: true },
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
    <header className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-rwa-bg/90 backdrop-blur-md border-b border-rwa-border' : 'bg-transparent'}`}>
      <nav className="rwa-section flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rwa-amber to-rwa-teal flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="5" stroke="white" strokeWidth="1.5"/><circle cx="8" cy="4" r="1.5" fill="white"/></svg>
          </div>
          <span className="text-lg font-bold tracking-tight">RWA-<span className="rwa-gradient-text">Sentinel</span></span>
        </Link>
        <ul className="hidden md:flex items-center gap-1">
          {NAV.map(n => <li key={n.label}>{n.external
            ? <a href={n.href} target="_blank" rel="noopener noreferrer" className="px-3 py-2 text-sm text-rwa-gray hover:text-white transition-colors cursor-pointer">{n.label}</a>
            : <button onClick={() => handleNav(n.href)} className="px-3 py-2 text-sm text-rwa-gray hover:text-white transition-colors cursor-pointer">{n.label}</button>
          }</li>)}
        </ul>
        <div className="hidden md:flex items-center gap-3">
          <Link to="/app" className="rwa-btn-outline !py-2 !px-4 !text-sm">Dashboard <ExternalLink size={14} /></Link>
          <button className="rwa-btn-primary !py-2 !px-4 !text-sm cursor-pointer">Connect Wallet</button>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 text-rwa-gray hover:text-white cursor-pointer" aria-label={mobileOpen ? 'Close' : 'Open'}>
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>
      <div className={`md:hidden transition-all duration-300 overflow-hidden ${mobileOpen ? 'max-h-96 border-b border-rwa-border' : 'max-h-0'}`} role="menu">
        <div className="rwa-section pb-6 pt-2 flex flex-col gap-1 bg-rwa-bg/95 backdrop-blur-md">
          {NAV.map(n => n.external
            ? <a key={n.label} href={n.href} target="_blank" rel="noopener noreferrer" className="py-3 px-3 text-rwa-gray hover:text-white cursor-pointer">{n.label}</a>
            : <button key={n.label} onClick={() => handleNav(n.href)} className="py-3 px-3 text-left text-rwa-gray hover:text-white cursor-pointer">{n.label}</button>
          )}
          <div className="flex gap-3 mt-3 px-3">
            <Link to="/app" onClick={() => setMobileOpen(false)} className="rwa-btn-outline !py-2 !px-4 !text-sm flex-1 justify-center">Dashboard</Link>
            <button className="rwa-btn-primary !py-2 !px-4 !text-sm flex-1 justify-center cursor-pointer">Connect</button>
          </div>
        </div>
      </div>
    </header>
  )
}

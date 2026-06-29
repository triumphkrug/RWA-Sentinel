import { useState, useEffect, useCallback } from 'react'
import { ArrowUp } from 'lucide-react'

export default function ScrollProgress() {
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(false)
  const handleScroll = useCallback(() => {
    const h = document.documentElement
    setProgress(Math.min(h.scrollTop / (h.scrollHeight - h.clientHeight) * 100, 100))
    setVisible(h.scrollTop > 400)
  }, [])
  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [handleScroll])
  const r = 20, c = 2 * Math.PI * r

  return (
    <>
      <div className="fixed top-0 left-0 w-full h-[2px] z-[60]" aria-hidden="true">
        <div className="h-full bg-gradient-to-r from-rwa-amber to-rwa-teal transition-[width] duration-150" style={{ width: `${progress}%` }} />
      </div>
      <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Scroll to top"
        className={`fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-rwa-card border border-rwa-border flex items-center justify-center cursor-pointer transition-all duration-300 hover:border-rwa-amber group ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
        <svg className="absolute inset-0 w-12 h-12 -rotate-90" viewBox="0 0 48 48">
          <circle cx="24" cy="24" r={r} fill="none" stroke="rgba(244,162,97,0.2)" strokeWidth="2" />
          <circle cx="24" cy="24" r={r} fill="none" stroke="#f4a261" strokeWidth="2" strokeDasharray={c} strokeDashoffset={c - (progress / 100) * c} strokeLinecap="round" />
        </svg>
        <ArrowUp size={18} className="text-rwa-gray group-hover:text-rwa-amber transition-colors" />
      </button>
    </>
  )
}

import { useEffect, useState } from 'react'
import { ChevronUp } from 'lucide-react'

export default function ScrollToTop() {
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const handler = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight
      const pct = total > 0 ? (window.scrollY / total) * 100 : 0
      setProgress(pct)
      setVisible(window.scrollY > 300)
    }
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const full = progress >= 98
  const fillColor = full ? '#b89030' : '#1a56db'
  const arrowColor = full ? '#fff' : '#fff'

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className={`fixed bottom-6 right-6 z-50 w-12 h-14 rounded-xl overflow-hidden transition-all duration-300 shadow-lg hover:shadow-xl ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      }`}
      style={{
        background: '#e2e8f0',
        border: `2px solid ${full ? '#b89030' : '#94a3b8'}`,
      }}
      aria-label="Scroll to top"
    >
      {/* Liquid fill – rises from bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 transition-all duration-150"
        style={{
          height: `${progress}%`,
          background: fillColor,
          borderRadius: progress < 100 ? '50% 50% 0 0 / 8px 8px 0 0' : '0',
        }}
      />
      {/* Arrow */}
      <div className="absolute inset-0 flex items-center justify-center">
        <ChevronUp className="w-5 h-5" style={{ color: arrowColor }} strokeWidth={2.5} />
      </div>
    </button>
  )
}

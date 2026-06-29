import { ArrowRight, FileText } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function CtaFooter() {
  return (
    <section className="py-12 sm:py-16">
      <div className="rwa-section">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-rwa-card to-rwa-card border border-rwa-border">
          <div className="absolute inset-0 bg-gradient-to-r from-rwa-amber/5 to-rwa-teal/5 pointer-events-none" />
          <div className="relative flex flex-col sm:flex-row items-center justify-between gap-6 p-8 sm:p-10">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold">See the verification pipeline in action</h2>
              <p className="text-rwa-gray text-sm mt-1">Inspect real attestations, scores, and expiry timers on testnet.</p>
            </div>
            <div className="flex gap-3 shrink-0">
              <a href="https://github.com/triumphkrug/RWA-Sentinel" target="_blank" rel="noopener noreferrer" className="rwa-btn-outline !text-sm">Docs <FileText size={16} /></a>
              <Link to="/app" className="rwa-btn-primary !text-sm">Open Dashboard <ArrowRight size={18} /></Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

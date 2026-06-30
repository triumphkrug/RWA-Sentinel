import { useState } from 'react'
import { X } from 'lucide-react'

export default function DemoNotice() {
  const [dismissed, setDismissed] = useState(false)
  
  if (dismissed) return null
  
  return (
    <div className="relative flex items-start gap-4 rounded-2xl border border-blue-500/30 bg-gradient-to-r from-blue-950/40 to-indigo-950/20 p-5 mb-6 shadow-lg">
      <img 
        src="/images/mascot/god_book.png" 
        alt="Oracle Mascot" 
        className="w-20 h-20 object-contain flex-shrink-0 drop-shadow-lg" 
      />
      <div className="flex-1 min-w-0 pt-1">
        <p className="text-gray-200 text-sm leading-relaxed">
          📖 God Book говорит: данные в Oracle Scoring и DAO Governance — демонстрационные. Real attestations появляются после подключения кошелька. Всё остальное — боевое: алёрты, контракты, on-chain записи.
        </p>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-4 right-4 p-1 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-white/10 transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

import { useState } from 'react'
import { X } from 'lucide-react'

export default function DemoNotice() {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  return (
    <div className="relative flex items-start gap-4 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-5 mb-6 shadow-sm">
      <img
        src="/images/mascot/god_book.png"
        alt="Oracle Guide"
        className="w-16 h-16 object-contain flex-shrink-0 drop-shadow-md"
      />
      <div className="flex-1 min-w-0 pt-0.5">
        <p className="text-gray-700 text-sm leading-relaxed">
          <span className="font-semibold text-amber-700">The Oracle speaks:</span> Scoring data and DAO governance entries are populated from testnet activity — connect a wallet to run the full pipeline and mint live attestations.
          Smart contracts, alert feeds, and on-chain records are <span className="font-medium text-blue-700">fully operational</span> on Casper testnet right now.
        </p>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-3 right-3 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        aria-label="Close"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

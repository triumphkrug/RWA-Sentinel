import { Info } from 'lucide-react'
import type { ReactNode } from 'react'

interface PageInfoProps {
  title: string
  children: ReactNode
}

export default function PageInfo({ title, children }: PageInfoProps) {
  return (
    <div className="bg-gradient-to-r from-blue-50 via-indigo-50/50 to-blue-50 rounded-xl border border-blue-100 p-5 mb-6">
      <div className="flex gap-3">
        <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-blue-900 text-sm mb-1.5">{title}</h3>
          <div className="text-sm text-blue-800/80 leading-relaxed space-y-1">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

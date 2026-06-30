import { AlertTriangle } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="mb-6">
          <img src="/images/mascot/god_why.png" alt="Oracle confused" className="w-48 mx-auto" />
        </div>
        <div className="flex items-center justify-center gap-2 mb-3">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          <span className="text-amber-600 font-semibold text-sm">ATTESTATION NOT FOUND</span>
        </div>
        <h1 className="text-6xl font-extrabold text-gray-900 mb-3">404</h1>
        <p className="text-gray-500 mb-8">This page has expired — just like our attestations should.</p>
        <a href="/" className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors">
          Return to Oracle
        </a>
      </div>
    </div>
  )
}

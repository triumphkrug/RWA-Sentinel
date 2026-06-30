import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <section className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center px-6">
        <img src="/images/mascot/god_why.png" alt="" className="w-40 mx-auto mb-6 drop-shadow-[0_10px_30px_rgba(184,144,48,0.15)]" />
        <h1 className="text-6xl font-extrabold text-rwa-blue mb-4">404</h1>
        <p className="text-xl text-gray-700 mb-2">The Oracle sees nothing here.</p>
        <p className="text-sm text-gray-500 mb-8">This page has not been attested. It does not exist on-chain.</p>
        <Link to="/" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-rwa-blue text-white font-semibold hover:scale-[1.02] transition-transform shadow-md">
          Return Home
        </Link>
      </div>
    </section>
  )
}

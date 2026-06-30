export default function Footer() {
  return (
    <footer className="py-8 bg-gray-50 border-t border-gray-200">
      <div className="rwa-section flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
        <div className="flex items-center gap-2">
          <img src="/images/logo.png" alt="" className="w-5 h-5" />
          <span className="font-semibold text-gray-700">RWA-Sentinel</span>
          <span>&middot; AI Oracle for Real-World Assets</span>
        </div>
        <div className="flex items-center gap-4">
          <span>Built on</span>
          <img src="/images/casper-logo.png" alt="Casper" className="w-4 h-4" />
          <img src="/images/casper-wordmark.png" alt="Casper Network" className="h-3.5 opacity-60" />
        </div>
      </div>
    </footer>
  )
}

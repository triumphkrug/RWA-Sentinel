import { useState } from 'react'
import { useClickRef } from '../../lib/click'
import { shortKey } from '../../lib/wallet'
import { Wallet, LogOut } from 'lucide-react'

export default function WalletStatus({ compact }: { compact?: boolean }) {
  const { publicKey, ready, clickRef } = useClickRef()
  const [hover, setHover] = useState(false)

  if (compact) {
    return (
      <button
        onClick={() => publicKey ? clickRef?.signOut() : clickRef?.signIn()}
        disabled={!ready}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className={`p-2 rounded-lg transition-all duration-200 ${
          publicKey
            ? hover
              ? 'text-red-600 bg-red-50 hover:bg-red-100'
              : 'text-green-600 bg-green-50'
            : 'text-blue-600 bg-blue-50 hover:bg-blue-100 disabled:opacity-50'
        }`}
        title={publicKey ? (hover ? 'Disconnect' : `Connected: ${shortKey(publicKey)}`) : 'Connect Wallet'}
      >
        {publicKey && hover ? <LogOut className="h-4 w-4" /> : <Wallet className="h-4 w-4" />}
      </button>
    )
  }

  if (publicKey) {
    return (
      <button
        onClick={() => clickRef?.signOut()}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className={`flex items-center gap-1.5 w-full rounded-lg border px-3 py-1.5 text-xs font-mono transition-all duration-200 ${
          hover
            ? 'bg-red-50 border-red-200 text-red-600'
            : 'bg-green-50 border-green-200 text-green-700'
        }`}
      >
        {hover ? (
          <>
            <LogOut className="h-3.5 w-3.5 shrink-0" />
            <span className="font-sans font-medium">Disconnect</span>
          </>
        ) : (
          <>
            <Wallet className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{shortKey(publicKey)}</span>
          </>
        )}
      </button>
    )
  }

  return (
    <button
      onClick={() => clickRef?.signIn()}
      disabled={!ready}
      className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors w-full justify-center"
    >
      <Wallet className="h-3.5 w-3.5" />
      {ready ? 'Connect Wallet' : 'Loading…'}
    </button>
  )
}

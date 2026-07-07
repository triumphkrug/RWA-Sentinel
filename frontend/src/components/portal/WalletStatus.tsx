import { useClickRef } from '../../lib/click'
import { shortKey } from '../../lib/wallet'
import { Wallet, Unplug } from 'lucide-react'

export default function WalletStatus() {
  const { publicKey, ready, clickRef } = useClickRef()

  return (
    <div className="flex items-center gap-2">
      {publicKey ? (
        <>
          <div className="flex items-center gap-1.5 rounded-lg bg-green-50 border border-green-200 px-3 py-1.5 text-xs font-mono text-green-700">
            <Wallet className="h-3.5 w-3.5" />
            {shortKey(publicKey)}
          </div>
          <button
            onClick={() => clickRef?.signOut()}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 hover:border-gray-300"
          >
            <Unplug className="h-3.5 w-3.5" /> Disconnect
          </button>
        </>
      ) : (
        <button
          onClick={() => clickRef?.signIn()}
          disabled={!ready}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Wallet className="h-3.5 w-3.5" />
          {ready ? 'Connect Wallet' : 'Loading…'}
        </button>
      )}
    </div>
  )
}

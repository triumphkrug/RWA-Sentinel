import { useClickRef } from '../../lib/click'
import { shortKey } from '../../lib/wallet'
import { Wallet, Unplug } from 'lucide-react'

export default function WalletStatus({ compact }: { compact?: boolean }) {
  const { publicKey, ready, clickRef } = useClickRef()

  if (compact) {
    return (
      <button
        onClick={() => publicKey ? clickRef?.signOut() : clickRef?.signIn()}
        disabled={!ready}
        className={`p-2 rounded-lg transition-colors ${
          publicKey
            ? 'text-green-600 bg-green-50 hover:bg-green-100'
            : 'text-blue-600 bg-blue-50 hover:bg-blue-100 disabled:opacity-50'
        }`}
        title={publicKey ? `Connected: ${shortKey(publicKey)}` : 'Connect Wallet'}
      >
        <Wallet className="h-4 w-4" />
      </button>
    )
  }

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
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors w-full justify-center"
        >
          <Wallet className="h-3.5 w-3.5" />
          {ready ? 'Connect Wallet' : 'Loading…'}
        </button>
      )}
    </div>
  )
}

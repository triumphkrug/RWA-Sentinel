/**
 * CSPR.click SDK integration for RWA-Sentinel.
 * Provides wallet connect via Casper Wallet, Ledger, or MetaMask Snap.
 * Adapted from ae402.xyz implementation.
 */
import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'

declare global {
  interface Window {
    clickUIOptions: Record<string, unknown>
    clickSDKOptions: Record<string, unknown>
    csprclick?: {
      signIn: () => void
      signOut: () => void
      getActiveAccountAsync: (opts?: { withBalance?: boolean }) => Promise<{ public_key?: string } | null>
      on: (event: string, handler: (data: unknown) => void) => void
      send: (deploy: unknown, senderKey: string) => Promise<{ deployHash: string }>
    }
  }
}

// Register at console.cspr.build for rwa-sentinel.xyz
const CSPRCLICK_APP_ID = (import.meta.env.VITE_CSPRCLICK_APP_ID as string | undefined) || 'rwa-sentinel-xyz'

// Light theme for RWA-Sentinel's white UI, no top bar
window.clickUIOptions = {
  uiContainer: 'csprclick-ui',
  rootAppElement: '#root',
  showTopBar: false,
  defaultTheme: 'light',
  accountMenuItems: ['CopyHashMenuItem'],
}

window.clickSDKOptions = {
  appName: 'RWA-Sentinel',
  appId: CSPRCLICK_APP_ID,
  providers: ['CasperWallet', 'Ledger', 'MetaMaskSnap'],
  contentMode: 'iframe',
}

type ClickContextState = {
  publicKey: string | undefined
  provider: string | undefined
  clickRef: typeof window.csprclick | undefined
  ready: boolean
}

type AccountChangedEvent = { account?: { public_key?: string; provider?: string } }

const ClickContext = createContext<ClickContextState | undefined>(undefined)

export const ClickProvider = ({ children }: { children: ReactNode }) => {
  const [publicKey, setPublicKey] = useState<string | undefined>()
  const [provider, setProvider] = useState<string | undefined>()
  const [clickRef, setClickRef] = useState<typeof window.csprclick | undefined>()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const checkActiveAccount = async (ref: NonNullable<typeof window.csprclick>) => {
      try {
        const account = await ref.getActiveAccountAsync({ withBalance: false })
        if (account?.public_key) {
          setPublicKey(account.public_key)
        }
      } catch {
        setPublicKey(undefined)
      }
    }

    const handleAccountChanged = (event: unknown) => {
      const e = event as AccountChangedEvent
      if (e.account?.public_key) {
        setPublicKey(e.account.public_key)
        setProvider(e.account.provider)
      } else {
        setPublicKey(undefined)
        setProvider(undefined)
      }
    }

    const handleSdkLoaded = () => {
      const ref = window.csprclick
      if (!ref) return
      setClickRef(ref)
      setReady(true)
      ref.on('csprclick:signed_in', handleAccountChanged)
      ref.on('csprclick:switched_account', handleAccountChanged)
      ref.on('csprclick:unsolicited_account_change', handleAccountChanged)
      ref.on('csprclick:signed_out', () => { setPublicKey(undefined); setProvider(undefined) })
      ref.on('csprclick:disconnected', () => { setPublicKey(undefined); setProvider(undefined) })
      checkActiveAccount(ref)
    }

    window.addEventListener('csprclick:loaded', handleSdkLoaded)
    if (window.csprclick) handleSdkLoaded()

    if (!document.querySelector('script#csprclick-client')) {
      const script = document.createElement('script')
      script.src = 'https://cdn.cspr.click/ui/v2.1.0/csprclick-client-2.1.0.js'
      script.id = 'csprclick-client'
      script.async = true
      document.head.appendChild(script)
    }

    return () => window.removeEventListener('csprclick:loaded', handleSdkLoaded)
  }, [])

  return (
    <ClickContext.Provider value={{ publicKey, provider, clickRef, ready }}>
      {children}
    </ClickContext.Provider>
  )
}

export const useClickRef = (): ClickContextState => {
  const ctx = useContext(ClickContext)
  if (!ctx) throw new Error('useClickRef must be used within a ClickProvider')
  return ctx
}

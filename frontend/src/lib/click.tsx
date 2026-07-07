/**
 * CSPR.click SDK integration for RWA-Sentinel.
 * Provides wallet connect via Casper Wallet, Ledger, or MetaMask Snap.
 */
import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { CONTENT_MODE, WALLET_KEYS } from '@make-software/csprclick-core-types'
import type { AccountType, CsprClickInitOptions, ICSPRClickSDK } from '@make-software/csprclick-core-types'
import type { ClickUIOptions } from '@make-software/csprclick-core-types/clickui'

declare global {
  interface Window {
    clickUIOptions: ClickUIOptions
    clickSDKOptions: CsprClickInitOptions
    csprclick?: ICSPRClickSDK
  }
}

// Registered at console.cspr.build for rwa-sentinel.xyz
const CSPRCLICK_APP_ID = (import.meta.env.VITE_CSPRCLICK_APP_ID as string | undefined) || '7c8101bb-03b8-4223-a6dd-9b7ce09e'

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
  providers: [WALLET_KEYS.CASPER_WALLET, WALLET_KEYS.LEDGER, WALLET_KEYS.METAMASK_SNAP],
  contentMode: CONTENT_MODE.IFRAME,
}

type ClickContextState = {
  publicKey: string | undefined
  provider: string | undefined
  clickRef: ICSPRClickSDK | undefined
  ready: boolean
}

type AccountChangedEvent = { account?: AccountType }

const ClickContext = createContext<ClickContextState | undefined>(undefined)

export const ClickProvider = ({ children }: { children: ReactNode }) => {
  const [connectedAccount, setConnectedAccount] = useState<AccountType | undefined>()
  const [clickRef, setClickRef] = useState<ICSPRClickSDK | undefined>()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const checkActiveAccount = async (ref: ICSPRClickSDK) => {
      try {
        const account = await ref.getActiveAccountAsync({ withBalance: false })
        setConnectedAccount(account?.public_key ? account : undefined)
      } catch (error) {
        console.error('CSPR.click: failed to get active account', error)
        setConnectedAccount(undefined)
      }
    }

    const handleAccountChanged = (event: AccountChangedEvent) => {
      setConnectedAccount(event.account?.public_key ? event.account : undefined)
    }

    const handleSdkLoaded = () => {
      const ref = window.csprclick
      if (!ref) return
      setClickRef(ref)
      setReady(true)
      ref.on('csprclick:signed_in', handleAccountChanged)
      ref.on('csprclick:switched_account', handleAccountChanged)
      ref.on('csprclick:unsolicited_account_change', handleAccountChanged)
      ref.on('csprclick:signed_out', () => setConnectedAccount(undefined))
      ref.on('csprclick:disconnected', () => setConnectedAccount(undefined))
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
    <ClickContext.Provider
      value={{ publicKey: connectedAccount?.public_key, provider: connectedAccount?.provider, clickRef, ready }}
    >
      {children}
    </ClickContext.Provider>
  )
}

export const useClickRef = (): ClickContextState => {
  const ctx = useContext(ClickContext)
  if (!ctx) throw new Error('useClickRef must be used within a ClickProvider')
  return ctx
}

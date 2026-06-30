/**
 * Casper Wallet integration with simulated fallback.
 */

const DEMO_PUBLIC_KEY = '02029f26b4cfeb3b970d6846bac2f0cab050b68d064e5d38a7609da2fd8e41746b79'
const DEMO_ACCOUNT_HASH = '535a3d80c9c1cba0190b036f8edd5a9623551a5eca4ab01a0d24dda537895467'

export interface WalletState {
  connected: boolean
  publicKey: string | null
  accountHash: string | null
  simulated: boolean
}

export function detectCasperWallet(): boolean {
  return typeof window !== 'undefined' && !!(window as unknown as Record<string, unknown>).CasperWalletProvider
}

export async function connectWallet(): Promise<WalletState> {
  if (detectCasperWallet()) {
    try {
      const provider = (window as unknown as Record<string, unknown>).CasperWalletProvider as () => {
        requestConnection: () => Promise<boolean>
        getActivePublicKey: () => Promise<string>
      }
      const wallet = provider()
      const ok = await wallet.requestConnection()
      if (ok) {
        const pubKey = await wallet.getActivePublicKey()
        return { connected: true, publicKey: pubKey, accountHash: pubKey.slice(0, 64), simulated: false }
      }
    } catch { /* fall through */ }
  }
  return { connected: true, publicKey: DEMO_PUBLIC_KEY, accountHash: DEMO_ACCOUNT_HASH, simulated: true }
}

export function disconnectWallet(): WalletState {
  return { connected: false, publicKey: null, accountHash: null, simulated: false }
}

export function shortKey(key: string): string {
  if (key.length <= 16) return key
  return key.slice(0, 8) + '...' + key.slice(-6)
}

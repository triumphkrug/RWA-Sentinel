/**
 * Wallet utilities for RWA-Sentinel.
 */

export interface WalletState {
  connected: boolean
  publicKey: string | null
}

export function shortKey(key: string): string {
  if (key.length <= 18) return key
  return key.slice(0, 10) + '…' + key.slice(-8)
}

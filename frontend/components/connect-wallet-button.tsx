"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "./ui/button"

declare global {
  interface Window {
    ethereum?: any
  }
}

export function ConnectWalletButton() {
  const [account, setAccount] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)

  useEffect(() => {
    if (!window.ethereum) return
    window.ethereum.request?.({ method: 'eth_accounts' })
      .then((accounts: string[]) => {
        setAccount(accounts?.[0] ?? null)
      })
      .catch(() => {})

    const handleAccountsChanged = (accounts: string[]) => {
      setAccount(accounts?.[0] ?? null)
    }

    try {
      window.ethereum?.on?.('accountsChanged', handleAccountsChanged)
    } catch {}

    return () => {
      try { window.ethereum?.removeListener?.('accountsChanged', handleAccountsChanged) } catch {}
    }
  }, [])

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask to connect your wallet.')
      return
    }
    setIsConnecting(true)
    try {
      const accounts: string[] = await window.ethereum.request({ method: 'eth_requestAccounts' })
      setAccount(accounts?.[0] ?? null)
    } catch (err) {
      console.warn('Wallet connection rejected', err)
    } finally {
      setIsConnecting(false)
    }
  }, [])

  const disconnect = useCallback(() => {
    setAccount(null)
    // Trigger page reload to clear any cached data
    window.location.reload()
  }, [])

  const short = (addr: string) => `${addr.slice(0, 6)}…${addr.slice(-4)}`

  if (account) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400">{short(account)}</span>
        <Button
          size="sm"
          variant="outline"
          onClick={disconnect}
          className="border-[#1f2937] bg-transparent text-white/90 hover:bg-white/5 h-6 px-2 text-xs"
        >
          Disconnect
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={connect}
          className="border-[#1f2937] bg-transparent text-white/90 hover:bg-white/5 h-6 px-2 text-xs"
        >
          Switch
        </Button>
      </div>
    )
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={connect}
      disabled={isConnecting}
      className="border-[#1f2937] bg-transparent text-white/90 hover:bg-white/5"
    >
      {isConnecting ? 'Connecting…' : 'Connect Wallet'}
    </Button>
  )
}

export default ConnectWalletButton



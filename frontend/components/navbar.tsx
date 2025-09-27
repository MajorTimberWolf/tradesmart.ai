"use client"

import ConnectWalletButton from "./connect-wallet-button"

export function Navbar() {
  return (
    <div className="sticky top-0 z-40 w-full border-b border-[#1a1a1a] bg-[#0a0a0a]">
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="text-sm font-semibold tracking-wide text-white/90">
          tradeSmart.AI
        </div>
        <ConnectWalletButton />
      </div>
    </div>
  )
}

export default Navbar



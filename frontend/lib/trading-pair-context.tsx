"use client"

import { createContext, useContext, useMemo, useState } from "react"

import { DEFAULT_TRADING_PAIR_ID, TRADING_PAIR_BY_ID, TRADING_PAIRS, type TradingPairConfig } from "./trading-pairs"

type TradingPairContextValue = {
  selectedPairId: string
  setSelectedPairId: (id: string) => void
  selectedPair: TradingPairConfig | undefined
  availablePairs: TradingPairConfig[]
}

const TradingPairContext = createContext<TradingPairContextValue | undefined>(undefined)

export function TradingPairProvider({ children }: { children: React.ReactNode }) {
  const [selectedPairId, setSelectedPairId] = useState<string>(DEFAULT_TRADING_PAIR_ID)

  const value = useMemo<TradingPairContextValue>(() => {
    const selectedPair = TRADING_PAIR_BY_ID[selectedPairId]
    return {
      selectedPairId,
      setSelectedPairId,
      selectedPair,
      availablePairs: TRADING_PAIRS,
    }
  }, [selectedPairId])

  return <TradingPairContext.Provider value={value}>{children}</TradingPairContext.Provider>
}

export function useTradingPair(): TradingPairContextValue {
  const ctx = useContext(TradingPairContext)
  if (!ctx) {
    throw new Error("useTradingPair must be used within a TradingPairProvider")
  }
  return ctx
}

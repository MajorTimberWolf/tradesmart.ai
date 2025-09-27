"use client"

import { useEffect, useRef, useState } from "react"
import TradingViewWidget, { TradingViewWidgetHandle } from "./tradingview-widget"

type SupportResistanceBand = {
  type: "support" | "resistance"
  lower: number
  upper: number
  mid: number
  projectedUntil?: number | null
}

type SupportResistanceEvent = {
  asset: string
  priceId: string
  generatedAt: string
  bands: SupportResistanceBand[]
  indicators: Record<string, unknown>
  jobId?: string | null
}

export function TradingChart() {
  const fixedInterval = "5"
  const symbol = "PYTH:BTCUSD"
  const widgetRef = useRef<TradingViewWidgetHandle | null>(null)
  const [supportResistance, setSupportResistance] = useState<SupportResistanceEvent | null>(null)

  const agentBase = process.env.NEXT_PUBLIC_AGENT_API ?? "http://localhost:8000"

  useEffect(() => {
    const eventSource = new EventSource(`${agentBase}/api/events`)

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data)
        if (payload.type === 'strategy.support_resistance.created') {
          setSupportResistance(payload.payload)
        }
      } catch (err) {
        console.warn('Failed to parse SSE payload', err)
      }
    }

    eventSource.onerror = (err) => {
      console.warn('SSE connection error', err)
      eventSource.close()
    }

    return () => eventSource.close()
  }, [agentBase])

  useEffect(() => {
    if (!supportResistance || !widgetRef.current) {
      return
    }

    const supportBand = supportResistance.bands.find((band) => band.type === 'support')
    const resistanceBand = supportResistance.bands.find((band) => band.type === 'resistance')

    if (supportBand && resistanceBand) {
      widgetRef.current.clearDrawings()
      widgetRef.current.drawZone(supportBand.lower, resistanceBand.upper, {
        text: `Support ${supportBand.lower.toFixed(2)} / Resistance ${resistanceBand.upper.toFixed(2)}`
      })
    }
  }, [supportResistance])

  return (
    <div className="w-full h-full bg-[#0a0a0a] p-4">
      {/* TradingView Chart */}
      <TradingViewWidget
        symbol={symbol}
        interval={fixedInterval}
        theme="dark"
        height={500}
        containerId="btc-tradingview-chart"
        ref={widgetRef}
      />
    </div>
  )
}

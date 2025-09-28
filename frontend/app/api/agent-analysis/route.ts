import { NextResponse } from "next/server"

import { TRADING_PAIR_BY_ID, DEFAULT_TRADING_PAIR_ID } from "@/lib/trading-pairs"

const BACKEND_BASE = (process.env.AGENT_API_BASE ?? "http://localhost:8000").replace(/\/$/, "")

type AgentRequest = {
  pairId?: string
  symbol?: string
  interval?: string
}

export async function POST(request: Request) {
  const body: AgentRequest = await request.json().catch(() => ({}))
  const pairId = body.pairId ?? body.symbol ?? DEFAULT_TRADING_PAIR_ID
  const pair = TRADING_PAIR_BY_ID[pairId]

  if (!pair) {
    return NextResponse.json({ detail: `Unsupported pair: ${pairId}` }, { status: 400 })
  }

  const response = await fetch(`${BACKEND_BASE}/api/strategies/support-resistance`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ symbol: pair.backendSymbol }),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => response.statusText)
    return NextResponse.json({ detail }, { status: response.status })
  }

  const payload = await response.json()
  const supportBand = payload.bands.find((band: any) => band.type === "support") ?? payload.bands[0]
  const resistanceBand = payload.bands.find((band: any) => band.type === "resistance") ?? payload.bands[1]

  const suggestion = {
    id: payload.jobId ?? crypto.randomUUID(),
    strategy_key: `support-resistance-${pair.backendSymbol}`,
    title: `Support ${supportBand?.lower?.toFixed?.(2) ?? "-"} / Resistance ${resistanceBand?.upper?.toFixed?.(2) ?? "-"}`,
    summary: "Support and resistance bands generated from 5-day Pyth history.",
    support_level: supportBand?.mid ?? 0,
    resistance_level: resistanceBand?.mid ?? 0,
    confidence: 0.7,
    actions: [
      {
        label: "Monitor support",
        description: supportBand
          ? `Watch for reactions between ${supportBand.lower.toFixed(2)} and ${supportBand.upper.toFixed(2)}.`
          : "Support band unavailable.",
      },
      {
        label: "Monitor resistance",
        description: resistanceBand
          ? `Watch for reactions between ${resistanceBand.lower.toFixed(2)} and ${resistanceBand.upper.toFixed(2)}.`
          : "Resistance band unavailable.",
      },
    ],
    symbol: pair.backendSymbol,
    pairId: pair.id,
    interval: body.interval ?? "5",
    created_at: payload.generatedAt,
    latest_price: null,
    change_percent: null,
    data_source: "pyth-agent",
    supportResistance: payload,
    tradingPair: {
      id: pair.id,
      baseToken: pair.baseToken,
      quoteToken: pair.quoteToken,
      backendSymbol: pair.backendSymbol,
      pythFeedId: pair.pythFeedId,
      label: pair.label,
      decimals: pair.decimals,
    },
    execution: {
      enabled: false,
      positionSize: { type: 'fixed_usd', value: 0 },
      slippageTolerance: 0.5,
      maxGasFee: 0.1,
    },
  }

  return NextResponse.json(suggestion)
}

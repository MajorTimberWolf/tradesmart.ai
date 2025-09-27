import { NextResponse } from "next/server"

const BACKEND_BASE = (process.env.AGENT_API_BASE ?? "http://localhost:8000").replace(/\/$/, "")

type AgentRequest = {
  symbol?: string
  interval?: string
}

const SYMBOL_MAP: Record<string, string> = {
  "PYTH:BTCUSD": "BTC_USD",
  "PYTH:ETHUSD": "ETH_USD",
}

export async function POST(request: Request) {
  const body: AgentRequest = await request.json().catch(() => ({}))
  const symbol = body.symbol ?? "PYTH:BTCUSD"
  const backendSymbol = SYMBOL_MAP[symbol]

  if (!backendSymbol) {
    return NextResponse.json({ detail: `Unsupported symbol: ${symbol}` }, { status: 400 })
  }

  const response = await fetch(`${BACKEND_BASE}/api/strategies/support-resistance`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ symbol: backendSymbol }),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => response.statusText)
    return NextResponse.json({ detail }, { status: response.status })
  }

  const payload = await response.json()
  const supportBand = payload.bands.find((band: any) => band.type === "support") ?? payload.bands[0]
  const resistanceBand = payload.bands.find((band: any) => band.type === "resistance") ?? payload.bands[1]
  const allBands = payload.bands.map((band: any) => ({
    ...band,
    lastTouch: band.lastTouch ?? band.last_touch_ts ?? null,
  }))
  const lastTouchTs = allBands.reduce(
    (latest: number | null, band: any) => {
      if (typeof band.lastTouch === "number") {
        return latest === null ? band.lastTouch : Math.max(latest, band.lastTouch)
      }
      if (typeof band.last_touch_ts === "number") {
        return latest === null ? band.last_touch_ts : Math.max(latest, band.last_touch_ts)
      }
      return latest
    },
    null
  )

  const lastTouchTime = lastTouchTs ? new Date(lastTouchTs * 1000).toISOString() : payload.generatedAt

  const supportMidDescription = supportBand
    ? `Support band observed around ${new Date(lastTouchTime).toLocaleString()} between ${supportBand.lower.toFixed(2)} and ${supportBand.upper.toFixed(2)}.`
    : "Support band unavailable."

  const suggestion = {
    id: payload.jobId ?? crypto.randomUUID(),
    strategy_key: `support-resistance-${backendSymbol}`,
    title: `Support ${supportBand?.lower?.toFixed?.(2) ?? "-"} / Resistance ${resistanceBand?.upper?.toFixed?.(2) ?? "-"}`,
    summary: "Support and resistance bands generated from 5-day Pyth history.",
    support_level: supportBand?.mid ?? 0,
    resistance_level: resistanceBand?.mid ?? 0,
    confidence: 0.7,
    actions: [
      {
        label: "Monitor support",
        description: supportBand
          ? `Watch for reactions between ${supportBand.lower.toFixed(2)} and ${supportBand.upper.toFixed(2)}. Last touched near ${new Date(lastTouchTime).toLocaleString()}.`
          : "Support band unavailable.",
      },
      {
        label: "Monitor resistance",
        description: resistanceBand
          ? `Watch for reactions between ${resistanceBand.lower.toFixed(2)} and ${resistanceBand.upper.toFixed(2)}. Last touched near ${new Date(lastTouchTime).toLocaleString()}.`
          : "Resistance band unavailable.",
      },
    ],
    symbol,
    interval: body.interval ?? "5",
    created_at: payload.generatedAt,
    latest_price: null,
    change_percent: null,
    data_source: "pyth-agent",
    supportResistance: { ...payload, bands: allBands, lastTouchTime },
  }

  return NextResponse.json(suggestion)
}

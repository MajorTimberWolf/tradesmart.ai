import { NextResponse } from "next/server"

type AgentRequest = {
  symbol?: string
  interval?: string
}

const PRICE_FEED_IDS: Record<string, string> = {
  "PYTH:BTCUSD": "0xe62df6c8b4c85fe1d7e619ae2fff751346436ff4c3e5e94a845ff6b0023fea8e"
}

const DEFAULT_SAMPLES = Array.from({ length: 60 }, (_, index) => {
  const base = 98500
  const variation = Math.sin(index / 5) * 300 + Math.cos(index / 9) * 150
  return {
    publishTime: Math.floor(Date.now() / 1000) - (60 * (60 - index)),
    price: base + variation
  }
})

type HistoryResponse = {
  samples: { price: number; publishTime: number }[]
  source: "pyth" | "fallback"
  endpointUsed?: string
}

async function fetchPythHistory(priceFeedId: string): Promise<HistoryResponse> {
  const endpoints = [
    `https://hermes.pyth.network/v2/price_feeds/${priceFeedId}/price/history?resolution=1m&limit=120`,
    `https://hermes.pyth.network/v2/price_feeds/${priceFeedId}/price/history?resolution=5m&limit=120`
  ]

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          Accept: "application/json"
        },
        cache: "no-store"
      })

      if (!response.ok) {
        continue
      }

      const json = await response.json()
      const history = Array.isArray(json?.price_history) ? json.price_history : json?.data
      if (!Array.isArray(history)) {
        continue
      }

      const samples = history
        .map((entry: any) => {
          const price = parseFloat(entry?.price ?? entry?.price?.price)
          const expo = typeof entry?.expo === "number" ? entry.expo : entry?.price?.expo
          const resolvedExpo = typeof expo === "number" ? expo : -8
          const normalizedPrice =
            typeof price === "number" && !Number.isNaN(price)
              ? price * Math.pow(10, resolvedExpo)
              : null

          if (normalizedPrice === null) {
            return null
          }

          const publishTime =
            typeof entry?.publish_time === "number"
              ? entry.publish_time
              : typeof entry?.publishTime === "number"
                ? entry.publishTime
                : typeof entry?.timestamp === "number"
                  ? Math.floor(entry.timestamp / 1000)
                  : null

          if (publishTime === null) {
            return null
          }

          return {
            price: normalizedPrice,
            publishTime
          }
        })
        .filter(Boolean) as { price: number; publishTime: number }[]

      if (samples.length) {
        return { samples, source: "pyth", endpointUsed: endpoint }
      }
    } catch (error) {
      console.warn("Pyth history request failed", endpoint, error)
    }
  }

  return { samples: DEFAULT_SAMPLES, source: "fallback" }
}

function buildSuggestion({
  symbol,
  interval,
  samples
}: {
  symbol: string
  interval: string
  samples: { price: number; publishTime: number }[]
}) {
  const sorted = [...samples].sort((a, b) => a.publishTime - b.publishTime)
  const prices = sorted.map((sample) => sample.price)
  const support = Math.min(...prices)
  const resistance = Math.max(...prices)
  const latest = sorted[sorted.length - 1]
  const earliest = sorted[Math.max(0, sorted.length - 60)]

  const change = latest && earliest ? ((latest.price - earliest.price) / earliest.price) * 100 : 0

  const confidence = Math.min(0.95, Math.max(0.4, Math.abs(change) / 10 + 0.5))
  const direction = change >= 0 ? "uptrend" : "downtrend"

  const summary = `Detected ${direction} momentum with price oscillating between ${support.toFixed(2)} and ${resistance.toFixed(2)}.`

  return {
    id: crypto.randomUUID(),
    strategy_key: `pyth-${symbol.toLowerCase()}-${interval}`,
    title: change >= 0 ? "Bullish Channel Opportunity" : "Watch for Bearish Reversal",
    summary,
    support_level: support,
    resistance_level: resistance,
    confidence,
    actions: [
      {
        label: change >= 0 ? "Consider Long" : "Protect Longs",
        description:
          change >= 0
            ? `Momentum is positive (+${change.toFixed(2)}%). Consider probing longs near support.`
            : `Momentum is soft (${change.toFixed(2)}%). Tighten risk on longs and watch resistance.`
      },
      {
        label: "Set Alerts",
        description: `Monitor breakouts outside ${support.toFixed(2)} - ${resistance.toFixed(2)}.`
      }
    ],
    symbol,
    interval,
    created_at: new Date().toISOString(),
    latest_price: latest?.price ?? null,
    change_percent: change
  }
}

export async function POST(request: Request) {
  const body: AgentRequest = await request.json().catch(() => ({}))
  const symbol = body.symbol ?? "PYTH:BTCUSD"
  const interval = body.interval ?? "5"

  const priceFeedId = PRICE_FEED_IDS[symbol]
  if (!priceFeedId) {
    return NextResponse.json({ detail: `Unsupported symbol: ${symbol}` }, { status: 400 })
  }

  const history = await fetchPythHistory(priceFeedId)
  const suggestion = buildSuggestion({ symbol, interval, samples: history.samples })
  const latest = history.samples[history.samples.length - 1]

  console.log("[Agent] Suggestion generated")
  console.log(`  Symbol: ${symbol}`)
  console.log(`  Interval: ${interval}`)
  console.log(`  Support level = ${suggestion.support_level.toFixed(2)}`)
  console.log(`  Resistance level = ${suggestion.resistance_level.toFixed(2)}`)
  console.log(`  Confidence = ${(suggestion.confidence * 100).toFixed(1)}%`)
  if (typeof suggestion.latest_price === "number") {
    console.log(`  Latest price = ${suggestion.latest_price.toFixed(2)}`)
  }
  console.log(`  Summary = ${suggestion.summary}`)
  console.log(`  Data source = ${history.source}${history.endpointUsed ? ` (${history.endpointUsed})` : ""}`)

  return NextResponse.json({
    ...suggestion,
    data_source: history.source,
    sample_count: history.samples.length,
    endpoint_used: history.endpointUsed ?? null,
    latest_publish_time: typeof latest?.publishTime === "number" ? latest.publishTime : null
  })
}

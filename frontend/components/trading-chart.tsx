"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import TradingViewWidget, { TradingViewWidgetHandle } from "./tradingview-widget"
import TimeIntervalFilters, { TimeInterval } from "./time-interval-filters"
import PriceHeader from "./price-header"
import { Button } from "./ui/button"

type StrategyAction = {
  label: string
  description: string
}

type StrategySuggestion = {
  id: string
  strategy_key: string
  title: string
  summary: string
  support_level: number
  resistance_level: number
  confidence: number
  actions: StrategyAction[]
  symbol: string
  interval: string
  created_at: string
}

export function TradingChart() {
  const [currentPrice, setCurrentPrice] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [symbol] = useState<string>("PYTH:BTCUSD")
  const wsRef = useRef<WebSocket | null>(null)
  const widgetRef = useRef<TradingViewWidgetHandle | null>(null)

  const [strategySuggestion, setStrategySuggestion] = useState<StrategySuggestion | null>(null)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const agentApiBase = process.env.NEXT_PUBLIC_AGENT_API_URL ?? process.env.NEXT_PUBLIC_AGENT_API
  const analysisEndpoint = useMemo(() => {
    if (!agentApiBase) return null
    try {
      return new URL('/analysis/chart', agentApiBase).toString()
    } catch (error) {
      console.warn('Invalid NEXT_PUBLIC_AGENT_API_URL value', error)
      return null
    }
  }, [agentApiBase])

  // Pyth price feed ID for BTC/USD
  const PRICE_FEED_ID = "0xe62df6c8b4c85fe1d7e619ae2fff751346436ff4c3e5e94a845ff6b0023fea8e"

  // Initialize with default BTC/USD data
  const initializeDefaultData = () => {
    const defaultBTCPrice = 98500 // Current BTC price range
    setCurrentPrice(defaultBTCPrice)
    setIsLoading(false)
  }

  // Fetch real price data from Pyth Network
  const fetchPythData = async () => {
    try {
      const feedParam = encodeURIComponent(PRICE_FEED_ID)
      const endpoints = [
        `https://hermes.pyth.network/api/latest_price_feeds?ids%5B%5D=${feedParam}`,
        `https://hermes.pyth.network/v2/price_feeds?ids%5B%5D=${feedParam}&with_confidence=true`
      ]

      for (const endpoint of endpoints) {
        try {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 3000)
          
          const response = await fetch(endpoint, {
            headers: {
              'Accept': 'application/json'
            },
            signal: controller.signal
          })
          
          clearTimeout(timeoutId)
          
          if (response.ok) {
            const data = await response.json()
            
            const parseFromLatestEndpoint = () => {
              if (!Array.isArray(data)) {
                return null
              }
              const latest = data[0]
              if (!latest || !latest.price) {
                return null
              }
              const publishPrice = latest.price?.price ?? latest.price?.aggregate?.price
              const expo = latest.price?.expo ?? latest.price?.aggregate?.expo ?? 0
              if (publishPrice === undefined) {
                return null
              }
              return parseFloat(publishPrice) * Math.pow(10, expo)
            }

            const parseFromV2Endpoint = () => {
              if (!data?.data?.[0]) {
                return null
              }
              const priceInfo = data.data[0]
              if (!priceInfo?.price?.price || typeof priceInfo.price.expo !== 'number') {
                return null
              }
              return parseFloat(priceInfo.price.price) * Math.pow(10, priceInfo.price.expo)
            }

            const parsedPrice = parseFromLatestEndpoint() ?? parseFromV2Endpoint()

            if (typeof parsedPrice === 'number' && parsedPrice > 0) {
              setCurrentPrice(parsedPrice)
              setPriceChange(((parsedPrice - 95000) / 95000) * 100)
              break
            }
          }
        } catch (error) {
          console.warn(`Endpoint ${endpoint} failed:`, error)
          continue
        }
      }
    } catch (error) {
      console.error("Error fetching Pyth data:", error)
    }
  }

  // Handle interval changes
  const handleIntervalChange = (interval: TimeInterval) => {
    setSelectedInterval(interval)
  }

  const handleAnalyzeChart = useCallback(async () => {
    if (!analysisEndpoint) {
      setAnalysisError('Agent analysis API is not configured. Set NEXT_PUBLIC_AGENT_API_URL or NEXT_PUBLIC_AGENT_API in your env.')
      return
    }

    if (!widgetRef.current) {
      setAnalysisError('TradingView chart is not ready yet.')
      return
    }

    setIsAnalyzing(true)
    setAnalysisError(null)

    try {
      const screenshot = await widgetRef.current.captureChart()
      if (!screenshot) {
        throw new Error('Unable to capture chart screenshot. Wait for the chart to finish loading and try again.')
      }

      const response = await fetch(analysisEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          image_base64: screenshot,
          symbol,
          interval: selectedInterval
        })
      })

      if (!response.ok) {
        const body = await response.json().catch(() => null)
        const errorMessage = body?.detail || `Analysis failed with status ${response.status}`
        throw new Error(errorMessage)
      }

      const suggestion: StrategySuggestion = await response.json()
      setStrategySuggestion(suggestion)

      if (widgetRef.current) {
        widgetRef.current.clearDrawings()
        widgetRef.current.drawZone(
          suggestion.support_level,
          suggestion.resistance_level,
          { text: suggestion.title }
        )
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('agent-strategy-generated'))
      }
    } catch (error) {
      console.error('Chart analysis failed', error)
      setAnalysisError(error instanceof Error ? error.message : 'Chart analysis failed')
    } finally {
      setIsAnalyzing(false)
    }
  }, [analysisEndpoint, selectedInterval, symbol])

  // WebSocket connection for real-time updates
  useEffect(() => {
    const connectWebSocket = () => {
      try {
        const ws = new WebSocket("wss://hermes.pyth.network/ws")
        
        ws.onopen = () => {
          console.log("Connected to Pyth WebSocket")
          ws.send(JSON.stringify({
            method: "subscribe",
            params: {
              ids: [PRICE_FEED_ID]
            }
          }))
        }

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            if (data.type === "price_update" && data.price) {
              const price = parseFloat(data.price.price) * Math.pow(10, data.price.expo)
              if (price > 0) {
                setCurrentPrice(price)
              }
            }
          } catch (error) {
            console.error("WebSocket message error:", error)
          }
        }

        ws.onerror = () => {
          console.warn("WebSocket connection failed")
        }

        ws.onclose = () => {
          console.log("WebSocket disconnected")
        }

        wsRef.current = ws
      } catch (error) {
        console.error("WebSocket connection error:", error)
      }
    }

    // Small delay to ensure component is mounted
    const timer = setTimeout(() => {
      connectWebSocket()
    }, 1000)

    return () => {
      clearTimeout(timer)
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [])

  // Initialize component
  useEffect(() => {
    initializeDefaultData()
    
    // Fetch real data after initialization
    const timer = setTimeout(() => {
      fetchPythData()
    }, 500)
    
    return () => clearTimeout(timer)
  }, [])

  if (isLoading) {
    return (
      <div className="w-full h-full bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-white text-lg">Loading BTC/USD Chart...</div>
      </div>
    )
  }

  return (
    <div className="w-full h-full bg-[#0a0a0a] p-4">
      {/* Price Header */}
      <PriceHeader 
        symbol="BTC/USD"
        currentPrice={currentPrice}
        priceChange={priceChange}
        isLoading={false}
      />

      {/* Time Interval Filters & Agent Analysis */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <TimeIntervalFilters 
          selectedInterval={selectedInterval}
          onIntervalChange={handleIntervalChange}
        />

        <div className="flex items-center gap-2">
          <Button 
            onClick={handleAnalyzeChart}
            disabled={isAnalyzing || isLoading || !analysisEndpoint}
          >
            {isAnalyzing ? 'Analyzing…' : 'Ask Agent'}
          </Button>
          {!analysisEndpoint && (
            <span className="text-xs text-gray-500">Set NEXT_PUBLIC_AGENT_API_URL or NEXT_PUBLIC_AGENT_API to enable agent insights.</span>
          )}
        </div>
      </div>

      {analysisError && (
        <div className="mt-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {analysisError}
        </div>
      )}

      {/* TradingView Chart */}
      <TradingViewWidget
        symbol={symbol}
        interval="5"
        theme="dark"
        height={500}
        containerId="btc-tradingview-chart"
        ref={widgetRef}
      />

      {strategySuggestion && (
        <div className="mt-4 rounded-lg border border-gray-700 bg-[#111111] p-4 text-sm text-gray-200">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-base font-semibold text-white">{strategySuggestion.title}</div>
              <div className="text-xs uppercase tracking-wide text-gray-500">
                {strategySuggestion.symbol} • {strategySuggestion.interval} timeframe
              </div>
            </div>
            <div className="text-xs font-semibold text-emerald-400">
              Confidence {(strategySuggestion.confidence * 100).toFixed(0)}%
            </div>
          </div>

          <p className="mt-3 text-sm leading-6 text-gray-300">{strategySuggestion.summary}</p>

          <div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:text-sm">
            <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3">
              <div className="text-emerald-300">Support</div>
              <div className="mt-1 text-lg font-semibold text-emerald-100">
                {strategySuggestion.support_level.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="rounded-md border border-orange-400/30 bg-orange-500/10 p-3">
              <div className="text-orange-300">Resistance</div>
              <div className="mt-1 text-lg font-semibold text-orange-100">
                {strategySuggestion.resistance_level.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {strategySuggestion.actions?.length ? (
            <div className="mt-4 space-y-2">
              {strategySuggestion.actions.map((action) => (
                <div
                  key={action.label}
                  className="rounded-md border border-gray-700/60 bg-[#181818] px-3 py-2"
                >
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    {action.label}
                  </div>
                  <div className="text-sm text-gray-300">{action.description}</div>
                </div>
              ))}
            </div>
          ) : null}

          <div className="mt-3 text-xs text-gray-500">
            Generated {new Date(strategySuggestion.created_at).toLocaleTimeString()}
          </div>
        </div>
      )}

      {/* Price Feed Info */}
      <div className="mt-4 text-xs text-gray-500">
        {currentPrice && (
          <div>Last Price: ${currentPrice.toLocaleString()}</div>
        )}
        <div>Symbol: {symbol}</div>
        <div>Data Source: Pyth Network Oracle via TradingView</div>
        <div>Last Update: {new Date().toLocaleString()}</div>
      </div>
    </div>
  )
}

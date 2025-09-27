"use client"

import { useEffect, useState, useRef } from "react"
import TradingViewWidget from "./tradingview-widget"
import TimeIntervalFilters, { TimeInterval } from "./time-interval-filters"
import PriceHeader from "./price-header"

export function TradingChart() {
  const [currentPrice, setCurrentPrice] = useState<number | null>(null)
  const [priceChange, setPriceChange] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedInterval, setSelectedInterval] = useState<TimeInterval>('5')
  const [symbol] = useState<string>("PYTH:BTCUSD")
  const wsRef = useRef<WebSocket | null>(null)

  // Pyth price feed ID for BTC/USD
  const PRICE_FEED_ID = "0xe62df6c8b4c85fe1d7e619ae2fff751346436ff4c3e5e94a845ff6b0023fea8e"

  // Initialize with default BTC/USD data
  const initializeDefaultData = () => {
    const defaultBTCPrice = 98500 // Current BTC price range
    setCurrentPrice(defaultBTCPrice)
    setPriceChange(2.45) // Mock positive change
    setIsLoading(false)
  }

  // Fetch real price data from Pyth Network
  const fetchPythData = async () => {
    try {
      const endpoints = [
        `https://hermes.pyth.network/v2/updates/price/latest?ids[]=${PRICE_FEED_ID}`,
        `https://api.pyth.network/v2/price_feeds/latest?ids[]=${PRICE_FEED_ID}`
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
            
            if (data.parsed && data.parsed.length > 0) {
              const priceInfo = data.parsed[0]
              const price = parseFloat(priceInfo.price.price) * Math.pow(10, priceInfo.price.expo)
              
              if (price > 0) {
                setCurrentPrice(price)
                // Calculate price change (mock for now)
                setPriceChange(((price - 95000) / 95000) * 100)
                break
              }
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

      {/* Time Interval Filters */}
      <TimeIntervalFilters 
        selectedInterval={selectedInterval}
        onIntervalChange={handleIntervalChange}
      />

      {/* TradingView Chart */}
      <TradingViewWidget
        symbol={symbol}
        interval={selectedInterval}
        theme="dark"
        height={500}
        containerId="btc-tradingview-chart"
      />

      {/* Price Feed Info */}
      <div className="mt-4 text-xs text-gray-500">
        <div>Symbol: {symbol}</div>
        <div>Data Source: Pyth Network Oracle via TradingView</div>
        <div>Last Update: {new Date().toLocaleString()}</div>
      </div>
    </div>
  )
}

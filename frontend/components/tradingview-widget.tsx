"use client"

import { useEffect, useRef } from "react"

interface TradingViewWidgetProps {
  symbol?: string
  interval?: string
  theme?: "light" | "dark"
  height?: number
  containerId?: string
}

declare global {
  interface Window {
    TradingView: any
  }
}

let tvScriptLoadingPromise: Promise<void> | null = null

export default function TradingViewWidget({
  symbol = "BTCUSD:PYTH",   // ✅ use TradingView-compatible Pyth symbol
  interval = "5",
  theme = "dark",
  height = 500,
  containerId = "tradingview"
}: TradingViewWidgetProps) {
  const widgetRef = useRef<any>(null)
  const onLoadScriptRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    onLoadScriptRef.current = createWidget

    if (!tvScriptLoadingPromise) {
      tvScriptLoadingPromise = new Promise((resolve, reject) => {
        const existingScript = document.getElementById("tradingview-widget-loading-script")
        if (existingScript) {
          existingScript.remove()
        }

        const script = document.createElement("script")
        script.id = "tradingview-widget-loading-script"
        script.src = "https://s3.tradingview.com/tv.js"
        script.type = "text/javascript"
        script.onload = () => resolve()
        script.onerror = () => reject("TradingView script failed to load")
        document.head.appendChild(script)
      })
    }

    tvScriptLoadingPromise
      .then(() => {
        if (onLoadScriptRef.current) {
          onLoadScriptRef.current()
        }
      })
      .catch((err) => {
        console.error("TradingView load error:", err)
      })

    return () => {
      onLoadScriptRef.current = null
      widgetRef.current = null
    }

    function createWidget() {
      if (document.getElementById(containerId) && "TradingView" in window) {
        widgetRef.current = new window.TradingView.widget({
          autosize: true,
          symbol: symbol,   // ✅ pass Pyth-enabled symbol
          interval: interval,
          timezone: "Etc/UTC",
          theme: theme,
          style: "1",
          locale: "en",
          toolbar_bg: theme === "dark" ? "#1f1f23" : "#f1f3f6",
          enable_publishing: false,
          allow_symbol_change: true, // ✅ allow symbol change for debugging
          container_id: containerId,
          backgroundColor: theme === "dark" ? "#1f1f23" : "#ffffff",
          gridColor: theme === "dark" ? "#2a2e39" : "#e1e3e6",
          hide_top_toolbar: false,
          hide_legend: false,
          save_image: true,
          studies_overrides: {},
          overrides: {
            "paneProperties.background": theme === "dark" ? "#1f1f23" : "#ffffff",
            "paneProperties.vertGridProperties.color": theme === "dark" ? "#2a2e39" : "#e1e3e6",
            "paneProperties.horzGridProperties.color": theme === "dark" ? "#2a2e39" : "#e1e3e6",
            "symbolWatermarkProperties.transparency": 90,
            "scalesProperties.textColor": theme === "dark" ? "#d1d4dc" : "#131722"
          }
        })
      }
    }
  }, [symbol, interval, theme, containerId])

  return (
    <div className="tradingview-widget-container w-full" style={{ height: `${height}px` }}>
      <div 
        id={containerId}
        className="w-full h-full rounded-lg border border-gray-700 bg-[#1f1f23]"
      />
    </div>
  )
}

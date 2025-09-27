"use client"

import { useEffect, useRef } from "react"

declare global {
  interface Window {
    TradingView: any
  }
}

export function TradingChart() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const script = document.createElement("script")
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js"
    script.type = "text/javascript"
    script.async = true
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: "BINANCE:BTCUSDT",
      interval: "D",
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "en",
      enable_publishing: false,
      backgroundColor: "rgba(10, 10, 10, 1)",
      gridColor: "rgba(42, 46, 57, 0.06)",
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      container_id: "tradingview_chart",
    })

    if (containerRef.current) {
      containerRef.current.appendChild(script)
    }

    return () => {
      if (containerRef.current && script.parentNode) {
        script.parentNode.removeChild(script)
      }
    }
  }, [])

  return (
    <div className="w-full h-full bg-[#0a0a0a]">
      <div ref={containerRef} id="tradingview_chart" className="w-full h-full" style={{ minHeight: "500px" }} />
    </div>
  )
}

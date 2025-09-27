"use client"

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react"

interface TradingViewWidgetProps {
  symbol?: string
  interval?: string
  theme?: "light" | "dark"
  height?: number
  containerId?: string
}

export interface TradingViewWidgetHandle {
  captureChart: () => Promise<string | null>
  drawZone: (supportPrice: number, resistancePrice: number, options?: { text?: string }) => void
  clearDrawings: () => void
}

declare global {
  interface Window {
    TradingView: any
  }
}

let tvScriptLoadingPromise: Promise<void> | null = null

export default forwardRef<TradingViewWidgetHandle, TradingViewWidgetProps>(function TradingViewWidget(
  {
    symbol = "BTCUSD:PYTH", // ✅ use TradingView-compatible Pyth symbol
    interval = "5",
    theme = "dark",
    height = 500,
    containerId = "tradingview"
  },
  ref
) {
  const widgetRef = useRef<any>(null)
  const chartRef = useRef<any>(null)
  const isChartReadyRef = useRef(false)
  const drawingsRef = useRef<any[]>([])
  const onLoadScriptRef = useRef<(() => void) | null>(null)

  useImperativeHandle(ref, () => ({
    captureChart: async () => {
      if (!isChartReadyRef.current || !widgetRef.current) {
        return null
      }

      const isPromiseLike = (value: unknown): value is PromiseLike<unknown> =>
        value !== null && typeof value === "object" && typeof (value as any).then === "function"

      const normalize = (payload: unknown): string | null => {
        if (typeof payload === "string") {
          return payload.startsWith("data:") ? payload : `data:image/png;base64,${payload}`
        }
        if (payload && typeof payload === "object") {
          const maybeDataUrl =
            (payload as { dataUrl?: unknown; url?: unknown; href?: unknown }).dataUrl ??
            (payload as { dataUrl?: unknown; url?: unknown; href?: unknown }).url ??
            (payload as { dataUrl?: unknown; url?: unknown; href?: unknown }).href

          if (typeof maybeDataUrl === "string") {
            return maybeDataUrl.startsWith("data:")
              ? maybeDataUrl
              : `data:image/png;base64,${maybeDataUrl}`
          }
        }
        return null
      }

      const tryWidgetScreenshot = async (): Promise<string | null> => {
        const widget = widgetRef.current
        if (typeof widget?.takeScreenshot !== "function") {
          return null
        }

        return new Promise<string | null>((resolve) => {
          let settled = false
          let timeoutId: ReturnType<typeof window.setTimeout>
          const finish = (value: string | null) => {
            if (settled) return
            settled = true
            clearTimeout(timeoutId)
            if (typeof widget?.offScreenshotReady === "function" && handler) {
              try {
                widget.offScreenshotReady(handler)
              } catch (cleanupError) {
                console.warn("TradingView offScreenshotReady failed", cleanupError)
              }
            }
            resolve(value)
          }

          const handler = typeof widget?.onScreenshotReady === "function"
            ? (payload: unknown) => finish(normalize(payload))
            : null

          try {
            handler && widget.onScreenshotReady(handler)
          } catch (subscribeError) {
            console.warn("TradingView onScreenshotReady failed", subscribeError)
          }

          try {
            const result = widget.takeScreenshot()
            if (isPromiseLike(result)) {
              result
                .then((value) => finish(normalize(value)))
                .catch((err) => {
                  console.warn("TradingView widget.takeScreenshot rejection", err)
                  finish(null)
                })
              return
            }

            if (result !== undefined) {
              finish(normalize(result))
              return
            }

            if (!handler) {
              finish(null)
            }
          } catch (error) {
            console.warn("TradingView widget.takeScreenshot failed", error)
            finish(null)
          }

          // Timeout safety to avoid hanging forever
          timeoutId = window.setTimeout(() => finish(null), 3000)
        })
      }

      const tryChartScreenshot = async (): Promise<string | null> => {
        const chart = chartRef.current
        if (!chart || typeof chart.takeScreenshot !== "function") {
          return null
        }

        try {
          const result = chart.takeScreenshot()
          if (isPromiseLike(result)) {
            return normalize(await result)
          }
          return normalize(result)
        } catch (error) {
          console.warn("TradingView chart.takeScreenshot failed", error)
          return null
        }
      }

      const tryExport = async (): Promise<string | null> => {
        const widget = widgetRef.current
        if (typeof widget?.exportChart !== "function") {
          return null
        }

        try {
          return await new Promise<string | null>((resolve) => {
            try {
              widget.exportChart(
                {
                  format: "png",
                  withData: false,
                  height: 500,
                  width: 900,
                },
                (payload: unknown) => {
                  if (typeof payload === "string") {
                    resolve(normalize(payload))
                    return
                  }
                  if (payload && typeof payload === "object" && "dataUrl" in payload) {
                    const maybeUrl = (payload as { dataUrl?: string }).dataUrl
                    resolve(normalize(maybeUrl ?? null))
                    return
                  }
                  resolve(null)
                }
              )
            } catch (err) {
              console.warn("TradingView exportChart failed", err)
              resolve(null)
            }
          })
        } catch (error) {
          console.warn("TradingView exportChart error", error)
          return null
        }
      }

      const screenshot =
        (await tryWidgetScreenshot()) ||
        (await tryChartScreenshot()) ||
        (await tryExport())

      return screenshot
    },
    drawZone: (supportPrice: number, resistancePrice: number, options) => {
      if (!chartRef.current || Number.isNaN(supportPrice) || Number.isNaN(resistancePrice)) {
        return
      }

      const lower = Math.min(supportPrice, resistancePrice)
      const upper = Math.max(supportPrice, resistancePrice)

      const chart = chartRef.current
      const visibleRange = chart.getVisibleRange?.()
      const nowSec = Math.floor(Date.now() / 1000)
      const spanSeconds = 60 * 60 * 4 // default to last 4 hours if range missing

      const from = visibleRange?.from ?? nowSec - spanSeconds
      const to = visibleRange?.to ?? nowSec

      try {
        const rectangle = chart.createMultipointShape(
          [
            { time: from, price: upper },
            { time: to, price: lower }
          ],
          {
            shape: "rectangle",
            disableSelection: true,
            disableUndo: true,
            lock: true,
            text: options?.text ?? "Support / Resistance",
            color: "#f97316",
            fillColor: "rgba(249, 115, 22, 0.12)",
            linewidth: 2
          }
        )

        if (rectangle) {
          drawingsRef.current.push(rectangle)
        }
      } catch (error) {
        console.error("TradingView drawing error", error)
      }
    },
    clearDrawings: () => {
      drawingsRef.current.forEach((shape) => {
        try {
          shape?.remove?.()
        } catch (error) {
          console.warn("Failed to remove shape", error)
        }
      })
      drawingsRef.current = []
    }
  }), [])

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
      chartRef.current = null
      isChartReadyRef.current = false
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

        widgetRef.current?.onChartReady?.(() => {
          try {
            chartRef.current = widgetRef.current.activeChart?.() || widgetRef.current.chart?.()
            isChartReadyRef.current = true
          } catch (error) {
            console.warn("TradingView chart reference unavailable", error)
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
})

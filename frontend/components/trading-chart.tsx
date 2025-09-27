"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import TradingViewWidget, { TradingViewWidgetHandle } from "./tradingview-widget"
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
  latest_price?: number | null
  change_percent?: number | null
  data_source?: 'pyth' | 'fallback'
  sample_count?: number
  endpoint_used?: string | null
  latest_publish_time?: number | null
}

export function TradingChart() {
  const fixedInterval = "5"
  const symbol = "PYTH:BTCUSD"
  const widgetRef = useRef<TradingViewWidgetHandle | null>(null)

  const [strategySuggestion, setStrategySuggestion] = useState<StrategySuggestion | null>(null)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [hasRecentSuggestion, setHasRecentSuggestion] = useState(false)

  const analysisEndpoint = useMemo(() => "/api/agent-analysis", [])

  const handleAnalyzeChart = useCallback(async () => {
    setIsAnalyzing(true)
    setAnalysisError(null)

    try {
      const response = await fetch(analysisEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          symbol,
          interval: fixedInterval
        })
      })

      if (!response.ok) {
        const body = await response.json().catch(() => null)
        const errorMessage = body?.detail || `Analysis failed with status ${response.status}`
        throw new Error(errorMessage)
      }

      const suggestion: StrategySuggestion = await response.json()
      setStrategySuggestion(suggestion)
      setHasRecentSuggestion(true)

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
  }, [analysisEndpoint, fixedInterval, symbol])

  useEffect(() => {
    if (!hasRecentSuggestion) {
      return
    }

    const timer = setTimeout(() => setHasRecentSuggestion(false), 6000)
    return () => clearTimeout(timer)
  }, [hasRecentSuggestion])

  return (
    <div className="w-full h-full bg-[#0a0a0a] p-4">
      {/* Agent Analysis */}
      <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
        <Button 
          onClick={handleAnalyzeChart}
          disabled={isAnalyzing}
        >
          {isAnalyzing ? 'Analyzing…' : 'Ask Agent'}
        </Button>
        {hasRecentSuggestion && (
          <span className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
            Suggestion delivered
          </span>
        )}
      </div>

      {analysisError && (
        <div className="mt-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {analysisError}
        </div>
      )}

      {/* TradingView Chart */}
      <TradingViewWidget
        symbol={symbol}
        interval={fixedInterval}
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
            {strategySuggestion.data_source && (
              <>
                <span className="mx-2">•</span>
                Source: {strategySuggestion.data_source}
                {strategySuggestion.sample_count ? ` (${strategySuggestion.sample_count} samples)` : ''}
                {strategySuggestion.endpoint_used ? (
                  <>
                    <span className="mx-2">•</span>
                    Endpoint used: {strategySuggestion.endpoint_used}
                  </>
                ) : null}
                {typeof strategySuggestion.latest_publish_time === 'number' ? (
                  <>
                    <span className="mx-2">•</span>
                    Latest publish: {new Date(strategySuggestion.latest_publish_time * 1000).toLocaleString()}
                  </>
                ) : null}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

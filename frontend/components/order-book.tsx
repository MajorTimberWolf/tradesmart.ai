"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
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
  supportResistance?: SupportResistanceEvent | null
}

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

export function OrderBook() {
  const fixedInterval = "5"
  const symbol = "PYTH:BTCUSD"
  
  const [strategySuggestion, setStrategySuggestion] = useState<StrategySuggestion | null>(null)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [hasRecentSuggestion, setHasRecentSuggestion] = useState(false)
  const [supportResistance, setSupportResistance] = useState<SupportResistanceEvent | null>(null)

  const analysisEndpoint = useMemo(() => "/api/agent-analysis", [])
  const agentBase = useMemo(
    () => (process.env.NEXT_PUBLIC_AGENT_API ?? "http://localhost:8000").replace(/\/$/, ""),
    []
  )

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

  // Auto-fetch data on component mount
  useEffect(() => {
    handleAnalyzeChart()
  }, [handleAnalyzeChart])

  useEffect(() => {
    if (!hasRecentSuggestion) {
      return
    }

    const timer = setTimeout(() => setHasRecentSuggestion(false), 6000)
    return () => clearTimeout(timer)
  }, [hasRecentSuggestion])

  // Listen for strategy suggestions from the main chart
  useEffect(() => {
    const handleStrategyGenerated = () => {
      // Re-fetch data when strategy is generated
      handleAnalyzeChart()
    }

    window.addEventListener('agent-strategy-generated', handleStrategyGenerated)
    return () => window.removeEventListener('agent-strategy-generated', handleStrategyGenerated)
  }, [handleAnalyzeChart])

  const supportBand = supportResistance?.bands.find((band) => band.type === 'support')
  const resistanceBand = supportResistance?.bands.find((band) => band.type === 'resistance')

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] border-r border-[#1a1a1a]">
      <div className="p-3">
        <div className="text-center text-white text-sm font-semibold mb-4">
          Live Support & Resistance Bands
        </div>
        
        {/* Ask Agent Button */}
        <div className="mb-4 flex flex-col items-center gap-2">
          <Button 
            onClick={handleAnalyzeChart}
            disabled={isAnalyzing}
            className="w-full"
            size="sm"
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
          <div className="mb-3 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {analysisError}
          </div>
        )}

        {isAnalyzing && (
          <div className="text-center text-gray-400 text-sm py-4">
            Analyzing market data...
          </div>
        )}

        {supportResistance && (
          <div className="space-y-3">
            {/* Header with confidence and time */}
            <div className="text-center">
              <div className="text-xs text-gray-400 mb-1">
                {supportResistance.asset} - {fixedInterval} TIMEFRAME
              </div>
              <div className="text-xs text-emerald-400">
                Confidence {((strategySuggestion?.confidence || 0.7) * 100).toFixed(0)}%
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {new Date(supportResistance.generatedAt).toLocaleTimeString()}
              </div>
            </div>

            {/* Support and Resistance Bands */}
            <div className="space-y-2">
              {/* Support Band */}
              {supportBand && (
                <div className="rounded-md border border-emerald-400/40 bg-emerald-500/10 p-3">
                  <div className="text-xs uppercase tracking-wide text-emerald-300 font-semibold mb-1">
                    SUPPORT
                  </div>
                  <div className="text-sm font-medium text-emerald-100">
                    {supportBand.lower.toFixed(2)} → {supportBand.upper.toFixed(2)}
                  </div>
                  <div className="text-xs text-emerald-400 mt-1">
                    Last touch {new Date(supportResistance.generatedAt).toLocaleString()}
                  </div>
                  {supportBand.projectedUntil && (
                    <div className="text-xs text-emerald-400">
                      Active until {new Date(supportBand.projectedUntil * 1000).toLocaleTimeString()}
                    </div>
                  )}
                </div>
              )}

              {/* Resistance Band */}
              {resistanceBand && (
                <div className="rounded-md border border-orange-400/40 bg-orange-500/10 p-3">
                  <div className="text-xs uppercase tracking-wide text-orange-300 font-semibold mb-1">
                    RESISTANCE
                  </div>
                  <div className="text-sm font-medium text-orange-100">
                    {resistanceBand.lower.toFixed(2)} → {resistanceBand.upper.toFixed(2)}
                  </div>
                  <div className="text-xs text-orange-400 mt-1">
                    Last touch {new Date(supportResistance.generatedAt).toLocaleString()}
                  </div>
                  {resistanceBand.projectedUntil && (
                    <div className="text-xs text-orange-400">
                      Active until {new Date(resistanceBand.projectedUntil * 1000).toLocaleTimeString()}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Current Values */}
            <div className="space-y-2">
              <div className="text-xs text-gray-400 text-center">
                Support {supportBand?.lower.toFixed(2) || '-'} / Resistance {resistanceBand?.upper.toFixed(2) || '-'}
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-2 text-center">
                  <div className="text-xs text-emerald-300">Support</div>
                  <div className="text-sm font-semibold text-emerald-100">
                    {supportBand?.mid.toFixed(2) || '-'}
                  </div>
                </div>
                <div className="rounded-md border border-orange-400/30 bg-orange-500/10 p-2 text-center">
                  <div className="text-xs text-orange-300">Resistance</div>
                  <div className="text-sm font-semibold text-orange-100">
                    {resistanceBand?.mid.toFixed(2) || '-'}
                  </div>
                </div>
              </div>
            </div>

            {/* Monitoring Instructions */}
            {strategySuggestion?.actions && (
              <div className="space-y-2">
                {strategySuggestion.actions.map((action) => (
                  <div
                    key={action.label}
                    className="rounded-md border border-gray-700/60 bg-[#181818] px-3 py-2"
                  >
                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">
                      {action.label}
                    </div>
                    <div className="text-xs text-gray-300">{action.description}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Summary */}
            <div className="text-xs text-gray-500 text-center">
              {strategySuggestion?.summary || 'Support and resistance bands generated from 5-day Pyth history.'}
            </div>
          </div>
        )}

        {!supportResistance && !isAnalyzing && !analysisError && (
          <div className="text-center text-gray-500 text-sm py-4">
            <div className="mb-2">📊 Order Book</div>
            <div className="text-xs">Click "Ask Agent" above to load support & resistance data</div>
          </div>
        )}
      </div>
    </div>
  )
}

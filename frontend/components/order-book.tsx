"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "./ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { StrategyBuilder, StrategyConfig, StrategyTradingPair, StrategyExecutionConfig } from "./strategy-builder"
import { useTradingPair } from "@/lib/trading-pair-context"
import { TRADING_PAIRS } from "@/lib/trading-pairs"

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
  pairId?: string
  interval: string
  created_at: string
  latest_price?: number | null
  change_percent?: number | null
  data_source?: 'pyth' | 'fallback'
  sample_count?: number
  endpoint_used?: string | null
  latest_publish_time?: number | null
  supportResistance?: SupportResistanceEvent | null
  tradingPair?: StrategyTradingPair
  execution?: StrategyExecutionConfig
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
  const { selectedPair, selectedPairId, setSelectedPairId } = useTradingPair()
  const [strategySuggestion, setStrategySuggestion] = useState<StrategySuggestion | null>(null)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [hasRecentSuggestion, setHasRecentSuggestion] = useState(false)
  const [supportResistance, setSupportResistance] = useState<SupportResistanceEvent | null>(null)
  const [showStrategyBuilder, setShowStrategyBuilder] = useState(false)

  const analysisEndpoint = useMemo(() => "/api/agent-analysis", [])
  const agentBase = useMemo(
    () => (process.env.NEXT_PUBLIC_AGENT_API ?? "http://localhost:8000").replace(/\/$/, ""),
    []
  )

  const handleAnalyzeChart = useCallback(async () => {
    if (!selectedPair) {
      setAnalysisError('Unsupported trading pair selected')
      return
    }
    setIsAnalyzing(true)
    setAnalysisError(null)

    try {
      const response = await fetch(analysisEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          pairId: selectedPairId,
          symbol: selectedPair.backendSymbol,
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
  }, [analysisEndpoint, fixedInterval, selectedPairId, selectedPair])

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

  // Removed auto-fetch - only fetch when user clicks "Ask Agent" button

  useEffect(() => {
    if (!hasRecentSuggestion) {
      return
    }

    const timer = setTimeout(() => setHasRecentSuggestion(false), 6000)
    return () => clearTimeout(timer)
  }, [hasRecentSuggestion])

  useEffect(() => {
    setSupportResistance(null)
    setStrategySuggestion(null)
    setShowStrategyBuilder(false)
  }, [selectedPairId])

  // Removed automatic re-fetch on strategy generation - only fetch when user clicks "Ask Agent"

  const supportBand = supportResistance?.bands.find((band) => band.type === 'support')
  const resistanceBand = supportResistance?.bands.find((band) => band.type === 'resistance')

  const handleStrategyCreate = useCallback(async (strategy: StrategyConfig) => {
    try {
      const response = await fetch('/api/strategy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(strategy)
      })

      if (!response.ok) {
        throw new Error('Failed to create strategy')
      }

      const result = await response.json()
      console.log('Strategy created:', result)
      
      // Show success message or handle as needed
      setShowStrategyBuilder(false)
    } catch (error) {
      console.error('Error creating strategy:', error)
    }
  }, [])

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0a] border-r border-[#1a1a1a]">
      <div className="p-3 flex-1 overflow-y-auto">
        <div className="text-center text-white text-sm font-semibold mb-4">
          Live Support & Resistance Bands
        </div>
        
        {/* Ask Agent Button */}
        <div className="mb-4 flex flex-col items-center gap-2">
          <Select value={selectedPairId} onValueChange={setSelectedPairId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select trading pair" />
            </SelectTrigger>
            <SelectContent>
              {TRADING_PAIRS.map((pair) => (
                <SelectItem key={pair.id} value={pair.id}>
                  {pair.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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

        {/* Strategy Builder Toggle */}
        {supportResistance && (
          <div className="mb-4">
            <Button 
              onClick={() => setShowStrategyBuilder(!showStrategyBuilder)}
              variant="outline"
              className="w-full"
              size="sm"
            >
              {showStrategyBuilder ? 'Hide Strategy Builder' : 'Build Strategy'}
            </Button>
          </div>
        )}
        
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
                {strategySuggestion?.tradingPair?.label ?? selectedPair?.label ?? supportResistance.asset} - {fixedInterval} TIMEFRAME
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
                  <div className="text-xs text-emerald-300">
                    Width {(supportBand.upper - supportBand.lower).toFixed(2)}
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
                  <div className="text-xs text-orange-300">
                    Width {(resistanceBand.upper - resistanceBand.lower).toFixed(2)}
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


            {/* Summary */}
            <div className="text-xs text-gray-500 text-center">
              {strategySuggestion?.summary || 'Support and resistance bands generated from 5-day Pyth history.'}
            </div>
          </div>
        )}

        {!supportResistance && !isAnalyzing && !analysisError && (
          <div className="text-center text-gray-500 text-sm py-8">
            <div className="mb-2">📊 Order Book</div>
            <div className="text-xs">Click "Ask Agent" to analyze chart and get liquidity levels</div>
            <div className="text-xs text-gray-600 mt-1">No automatic fetching - manual control only</div>
          </div>
        )}

        {/* Strategy Builder */}
        {showStrategyBuilder && supportResistance && (
          <div className="mt-6">
            {selectedPair && (
              <StrategyBuilder
                supportLevel={supportBand?.mid}
                resistanceLevel={resistanceBand?.mid}
                symbol={selectedPair.backendSymbol}
                timeframe={fixedInterval}
                pair={selectedPair}
                onStrategyCreate={handleStrategyCreate}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

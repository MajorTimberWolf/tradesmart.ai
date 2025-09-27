"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"

interface StrategyAction {
  label: string
  description: string
}

interface StrategySuggestion {
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

export function StrategyAddressBook() {
  const [strategies, setStrategies] = useState<StrategySuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const agentApiBase = process.env.NEXT_PUBLIC_AGENT_API_URL ?? process.env.NEXT_PUBLIC_AGENT_API
  const strategiesEndpoint = useMemo(() => {
    if (!agentApiBase) return null
    try {
      return new URL('/analysis/strategies', agentApiBase).toString()
    } catch (err) {
      console.warn('Invalid NEXT_PUBLIC_AGENT_API_URL value', err)
      return null
    }
  }, [agentApiBase])

  const loadStrategies = useCallback(async () => {
    if (!strategiesEndpoint) {
      setError('Connect the agent API to populate strategy suggestions.')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(strategiesEndpoint, { cache: 'no-store' })
      if (!response.ok) {
        throw new Error(`Failed to load strategies (${response.status})`)
      }

      const data: StrategySuggestion[] = await response.json()
      setStrategies(data)
    } catch (err) {
      console.error('Failed to fetch strategies', err)
      setError(err instanceof Error ? err.message : 'Failed to load strategies')
    } finally {
      setIsLoading(false)
    }
  }, [strategiesEndpoint])

  useEffect(() => {
    loadStrategies()
  }, [loadStrategies])

  useEffect(() => {
    if (!strategiesEndpoint) return

    const handler = () => {
      loadStrategies()
    }

    window.addEventListener('agent-strategy-generated', handler)
    return () => window.removeEventListener('agent-strategy-generated', handler)
  }, [loadStrategies, strategiesEndpoint])

  const renderStrategy = (strategy: StrategySuggestion) => (
    <div
      key={strategy.id}
      className="rounded-lg border border-gray-700/70 bg-[#121212] p-3 text-xs text-gray-300"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-white">{strategy.title}</div>
          <div className="text-[10px] uppercase tracking-wide text-gray-500">
            {strategy.symbol} • {strategy.interval}
          </div>
        </div>
        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
          {(strategy.confidence * 100).toFixed(0)}%
        </span>
      </div>

      <p className="mt-2 line-clamp-3 text-[13px] leading-5 text-gray-300">{strategy.summary}</p>

      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
        <div className="rounded-md border border-emerald-500/20 bg-emerald-500/10 p-2 text-emerald-200">
          <span className="block text-[10px] uppercase tracking-wide text-emerald-300/80">Support</span>
          <span className="text-sm font-semibold text-emerald-100">
            {strategy.support_level.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </span>
        </div>
        <div className="rounded-md border border-orange-400/20 bg-orange-500/10 p-2 text-orange-200">
          <span className="block text-[10px] uppercase tracking-wide text-orange-300/80">Resistance</span>
          <span className="text-sm font-semibold text-orange-100">
            {strategy.resistance_level.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {strategy.actions?.length ? (
        <ul className="mt-3 space-y-1">
          {strategy.actions.slice(0, 2).map((action) => (
            <li key={action.label} className="rounded border border-gray-700/60 bg-[#1a1a1a] px-2 py-1 text-[11px]">
              <span className="block font-semibold text-white">{action.label}</span>
              <span className="text-gray-400">{action.description}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-3 text-[10px] uppercase tracking-wide text-gray-500">
        {new Date(strategy.created_at).toLocaleString()}
      </div>
    </div>
  )

  return (
    <div className="flex h-full flex-col gap-3 border-t border-border bg-[#0d0d0d] p-4 text-sm text-gray-300">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-white">Strategy Address Book</div>
          <div className="text-xs text-gray-500">Latest ideas proposed by the on-chain agent</div>
        </div>
        <Button size="sm" variant="outline" onClick={loadStrategies} disabled={isLoading || !strategiesEndpoint}>
          {isLoading ? 'Refreshing…' : 'Refresh'}
        </Button>
      </div>

      {!strategiesEndpoint ? (
        <div className="rounded-md border border-yellow-500/40 bg-yellow-500/10 p-3 text-xs text-yellow-200">
          Set NEXT_PUBLIC_AGENT_API_URL or NEXT_PUBLIC_AGENT_API to load agent-generated strategies.
        </div>
      ) : error ? (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-200">
          {error}
        </div>
      ) : strategies.length === 0 && !isLoading ? (
        <div className="rounded-md border border-gray-700 bg-[#101010] p-4 text-center text-xs text-gray-400">
          No strategies yet. Ask the agent to analyze the chart.
        </div>
      ) : (
        <div className="flex flex-col gap-3 overflow-y-auto pb-1">
          {strategies.map(renderStrategy)}
        </div>
      )}
    </div>
  )
}

export default StrategyAddressBook

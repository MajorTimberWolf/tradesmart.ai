"use client"

import { useState } from "react"
import { Button } from "./ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { IndicatorSelector } from "./indicator-selector"
import { RiskRewardSelector } from "./risk-reward-selector"

export interface StrategyConfig {
  riskRewardRatio: string
  indicators: IndicatorConfig[]
  liquidityLevel: {
    type: 'support' | 'resistance'
    price: number
  }
  symbol: string
  timeframe: string
}

export interface IndicatorConfig {
  name: string
  enabled: boolean
  parameters: Record<string, any>
  condition: 'above' | 'below' | 'crosses' | 'divergence'
  threshold?: number
}

interface StrategyBuilderProps {
  supportLevel?: number
  resistanceLevel?: number
  symbol: string
  timeframe: string
  onStrategyCreate: (strategy: StrategyConfig) => void
}

export function StrategyBuilder({ 
  supportLevel, 
  resistanceLevel, 
  symbol, 
  timeframe,
  onStrategyCreate 
}: StrategyBuilderProps) {
  const [selectedLiquidityType, setSelectedLiquidityType] = useState<'support' | 'resistance'>('support')
  const [riskRewardRatio, setRiskRewardRatio] = useState<string>('1:2')
  const [selectedIndicators, setSelectedIndicators] = useState<IndicatorConfig[]>([])

  const handleCreateStrategy = () => {
    const liquidityLevel = selectedLiquidityType === 'support' 
      ? { type: 'support' as const, price: supportLevel || 0 }
      : { type: 'resistance' as const, price: resistanceLevel || 0 }

    const strategy: StrategyConfig = {
      riskRewardRatio,
      indicators: selectedIndicators.filter(ind => ind.enabled),
      liquidityLevel,
      symbol,
      timeframe
    }

    onStrategyCreate(strategy)
  }

  const canCreateStrategy = supportLevel && resistanceLevel && selectedIndicators.some(ind => ind.enabled)

  return (
    <div className="space-y-4 p-4 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg">
      <div className="text-center">
        <h3 className="text-white text-sm font-semibold mb-2">Strategy Builder</h3>
        <p className="text-xs text-gray-400">Configure your trading strategy based on liquidity levels</p>
      </div>

      {/* Liquidity Level Selection */}
      <div className="space-y-2">
        <label className="text-xs text-gray-300 font-medium">Liquidity Level</label>
        <Select value={selectedLiquidityType} onValueChange={(value: 'support' | 'resistance') => setSelectedLiquidityType(value)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="support">
              Support: {supportLevel?.toFixed(2) || 'N/A'}
            </SelectItem>
            <SelectItem value="resistance">
              Resistance: {resistanceLevel?.toFixed(2) || 'N/A'}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Risk Reward Ratio */}
      <RiskRewardSelector 
        value={riskRewardRatio} 
        onChange={setRiskRewardRatio} 
      />

      {/* Technical Indicators */}
      <IndicatorSelector 
        indicators={selectedIndicators}
        onChange={setSelectedIndicators}
      />

      {/* Create Strategy Button */}
      <Button 
        onClick={handleCreateStrategy}
        disabled={!canCreateStrategy}
        className="w-full"
        size="sm"
      >
        Create Strategy
      </Button>

      {!canCreateStrategy && (
        <p className="text-xs text-gray-500 text-center">
          {!supportLevel || !resistanceLevel 
            ? "Waiting for liquidity levels..." 
            : "Select at least one indicator to create strategy"
          }
        </p>
      )}
    </div>
  )
}

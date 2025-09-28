"use client"

import { useMemo, useState } from "react"
import { Button } from "./ui/button"
import { uploadStrategyEncrypted, signAuthMessageWithWallet } from "@/lib/lighthouse"
import type { TradingPairConfig } from "@/lib/trading-pairs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { IndicatorSelector } from "@/components/indicator-selector"
import { RiskRewardSelector } from "@/components/risk-reward-selector"
import { toast } from "@/hooks/use-toast"
import { StrategyExecutionSettings, PositionSizeType } from "./strategy-execution-settings"

export interface StrategyConfig {
  riskRewardRatio: string
  indicators: IndicatorConfig[]
  liquidityLevel: {
    type: 'support' | 'resistance'
    price: number
  }
  symbol: string
  timeframe: string
  tradingPair: StrategyTradingPair
  execution: StrategyExecutionConfig
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
  pair: TradingPairConfig
  onStrategyCreate: (strategy: StrategyConfig) => void
}

export interface StrategyTradingPair {
  id: string
  backendSymbol: string
  baseToken: string
  quoteToken: string
  pythFeedId: string
  label: string
  decimals: {
    base: number
    quote: number
  }
}

export interface StrategyExecutionConfig {
  enabled: boolean
  positionSize: {
    type: PositionSizeType
    value: number
  }
  slippageTolerance: number
  maxGasFee: number
}

export function StrategyBuilder({ 
  supportLevel, 
  resistanceLevel, 
  symbol, 
  timeframe,
  pair,
  onStrategyCreate 
}: StrategyBuilderProps) {
  const [selectedLiquidityType, setSelectedLiquidityType] = useState<'support' | 'resistance'>('support')
  const [riskRewardRatio, setRiskRewardRatio] = useState<string>('1:2')
  const [selectedIndicators, setSelectedIndicators] = useState<IndicatorConfig[]>([])
  const [executionEnabled, setExecutionEnabled] = useState<boolean>(false)
  const [positionSizeType, setPositionSizeType] = useState<PositionSizeType>('fixed_usd')
  const [positionSizeValue, setPositionSizeValue] = useState<number>(100)
  const [slippageTolerance, setSlippageTolerance] = useState<number>(0.5)
  const [maxGasFee, setMaxGasFee] = useState<number>(0.1)

  const handleCreateStrategy = async () => {
    const liquidityLevel = selectedLiquidityType === 'support' 
      ? { type: 'support' as const, price: supportLevel || 0 }
      : { type: 'resistance' as const, price: resistanceLevel || 0 }

    const strategy: StrategyConfig = {
      riskRewardRatio,
      indicators: selectedIndicators.filter(ind => ind.enabled),
      liquidityLevel,
      symbol,
      timeframe,
      tradingPair: {
        id: pair.id,
        backendSymbol: pair.backendSymbol,
        baseToken: pair.baseToken,
        quoteToken: pair.quoteToken,
        pythFeedId: pair.pythFeedId,
        label: pair.label,
        decimals: pair.decimals
      },
      execution: {
        enabled: executionEnabled,
        positionSize: {
          type: positionSizeType,
          value: positionSizeValue
        },
        slippageTolerance,
        maxGasFee
      }
    }

    // Upload encrypted to Lighthouse using wallet signature
    try {
      const apiKey = process.env.NEXT_PUBLIC_LIGHTHOUSE_API_KEY as string | undefined
      
      if (!apiKey) {
        console.warn('Lighthouse API key not configured')
        return
      }

      if (typeof window === 'undefined' || !(window as any).ethereum) {
        console.warn('Wallet not available for signing')
        return
      }

      // Request wallet connection and signature
      const accounts: string[] = await (window as any).ethereum.request({ method: 'eth_requestAccounts' })
      const account = accounts?.[0]
      console.log('🔐 Upload using account:', account)
      
      if (!account) {
        console.warn('No wallet account available')
        return
      }

      // Per Lighthouse best-practice: fetch auth message and sign that
      const signedMessage = await signAuthMessageWithWallet(account)

      console.log('📤 Uploading strategy with publicKey:', account)
      const res = await uploadStrategyEncrypted(strategy, {
        apiKey,
        publicKey: account,
        signedMessage,
        name: `strategy-${pair.id}-${Date.now()}`
      })
      console.log('✅ Upload response:', res)
      
      toast({
        title: 'Strategy stored',
        description: `Saved to Lighthouse (CID: ${res.cid})`
      })
      
      // Emit event so others can load list
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('strategy-stored', { detail: { cid: res.cid, url: res.url, strategy } }))
      }
      
    } catch (err) {
      console.error('Lighthouse upload failed:', err)
    }

    onStrategyCreate(strategy)
  }

  const canCreateStrategy = useMemo(() => {
    const hasBands = !!supportLevel && !!resistanceLevel
    const hasIndicators = selectedIndicators.some(ind => ind.enabled)
    if (!hasBands || !hasIndicators) {
      return false
    }
    if (!executionEnabled) {
      return true
    }
    const validPosition = positionSizeValue > 0
    const validSlippage = slippageTolerance >= 0.1 && slippageTolerance <= 3
    const validGas = maxGasFee > 0
    return validPosition && validSlippage && validGas
  }, [executionEnabled, supportLevel, resistanceLevel, selectedIndicators, positionSizeValue, slippageTolerance, maxGasFee])

  const validationMessage = useMemo(() => {
    if (!supportLevel || !resistanceLevel) {
      return "Waiting for liquidity levels..."
    }
    if (!selectedIndicators.some(ind => ind.enabled)) {
      return "Select at least one indicator to create strategy"
    }
    if (executionEnabled) {
      if (positionSizeValue <= 0) {
        return "Set a position size greater than zero"
      }
      if (slippageTolerance < 0.1 || slippageTolerance > 3) {
        return "Adjust slippage tolerance between 0.1% and 3%"
      }
      if (maxGasFee <= 0) {
        return "Specify a positive max gas fee"
      }
    }
    return null
  }, [executionEnabled, supportLevel, resistanceLevel, selectedIndicators, positionSizeValue, slippageTolerance, maxGasFee])

  return (
    <div className="space-y-4 p-4 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg">
      <div className="text-center">
        <h3 className="text-white text-sm font-semibold mb-2">Strategy Builder</h3>
        <p className="text-xs text-gray-400">Configure your trading strategy based on liquidity levels</p>
        <p className="text-[10px] text-gray-500 mt-1">Pair: {pair.label}</p>
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

      <StrategyExecutionSettings
        pairLabel={pair.label}
        executionEnabled={executionEnabled}
        onExecutionEnabledChange={setExecutionEnabled}
        positionSizeType={positionSizeType}
        onPositionSizeTypeChange={setPositionSizeType}
        positionSizeValue={positionSizeValue}
        onPositionSizeValueChange={setPositionSizeValue}
        slippageTolerance={slippageTolerance}
        onSlippageToleranceChange={setSlippageTolerance}
        maxGasFee={maxGasFee}
        onMaxGasFeeChange={setMaxGasFee}
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
          {validationMessage}
        </p>
      )}
    </div>
  )
}

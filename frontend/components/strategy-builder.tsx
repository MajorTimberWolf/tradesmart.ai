"use client"

import { useState } from "react"
import { Button } from "./ui/button"
import { uploadStrategyEncrypted, signAuthMessageWithWallet } from "@/lib/lighthouse"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { IndicatorSelector } from "@/components/indicator-selector"
import { RiskRewardSelector } from "@/components/risk-reward-selector"
import { toast } from "@/hooks/use-toast"

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

  const handleCreateStrategy = async () => {
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
        name: `strategy-${symbol}-${Date.now()}`
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

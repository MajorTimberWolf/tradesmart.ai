import { NextRequest, NextResponse } from 'next/server'

const BACKEND_BASE = (process.env.AGENT_API_BASE ?? 'http://localhost:8000').replace(/\/$/, '')

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
    type: 'fixed_usd' | 'percentage'
    value: number
  }
  slippageTolerance: number
  maxGasFee: number
}

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

export async function POST(request: NextRequest) {
  try {
    const strategy: StrategyConfig = await request.json()

    // Validate the strategy configuration
    if (!strategy.riskRewardRatio || !strategy.symbol || !strategy.timeframe) {
      return NextResponse.json(
        { error: 'Missing required strategy fields' },
        { status: 400 }
      )
    }

    if (!strategy.liquidityLevel || !strategy.liquidityLevel.type || !strategy.liquidityLevel.price) {
      return NextResponse.json(
        { error: 'Invalid liquidity level configuration' },
        { status: 400 }
      )
    }

    if (!strategy.indicators || strategy.indicators.length === 0) {
      return NextResponse.json(
        { error: 'At least one indicator must be configured' },
        { status: 400 }
      )
    }

    if (!strategy.tradingPair || !strategy.tradingPair.baseToken || !strategy.tradingPair.quoteToken) {
      return NextResponse.json(
        { error: 'Missing trading pair configuration' },
        { status: 400 }
      )
    }

    if (!strategy.execution || typeof strategy.execution.enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing execution configuration' },
        { status: 400 }
      )
    }

    if (strategy.execution.enabled) {
      const { positionSize, slippageTolerance, maxGasFee } = strategy.execution
      if (!positionSize || positionSize.value <= 0) {
        return NextResponse.json(
          { error: 'Invalid position size' },
          { status: 400 }
        )
      }
      if (slippageTolerance <= 0 || slippageTolerance > 10) {
        return NextResponse.json(
          { error: 'Invalid slippage tolerance' },
          { status: 400 }
        )
      }
      if (maxGasFee <= 0) {
        return NextResponse.json(
          { error: 'Invalid gas fee limit' },
          { status: 400 }
        )
      }
    }

    // Create a unique strategy ID
    const strategyId = `strategy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Enhanced strategy object with metadata
    const enhancedStrategy = {
      id: strategyId,
      ...strategy,
      createdAt: new Date().toISOString(),
      status: 'active',
      metadata: {
        version: '1.0',
        source: 'frontend-strategy-builder',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    }

    const backendResponse = await fetch(`${BACKEND_BASE}/api/strategies/execution`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(enhancedStrategy)
    })

    if (!backendResponse.ok) {
      const detail = await backendResponse.text().catch(() => backendResponse.statusText)
      console.error('Backend strategy persistence failed:', detail)
      return NextResponse.json(
        { error: 'Backend persistence failed', detail },
        { status: 502 }
      )
    }

    const persisted = await backendResponse.json().catch(() => null)

    return NextResponse.json({
      success: true,
      strategyId,
      message: 'Strategy created successfully',
      strategy: persisted ?? enhancedStrategy
    })

  } catch (error) {
    console.error('Error creating strategy:', error)
    return NextResponse.json(
      { error: 'Failed to create strategy' },
      { status: 500 }
    )
  }
}

export async function GET() {
  // Return list of active strategies (placeholder)
  return NextResponse.json({
    strategies: [],
    message: 'Strategy list endpoint - implement as needed'
  })
}

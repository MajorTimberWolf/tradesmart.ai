"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"

export type PositionSizeType = 'fixed_usd' | 'percentage'

export interface StrategyExecutionSettingsProps {
  pairLabel: string
  executionEnabled: boolean
  onExecutionEnabledChange: (enabled: boolean) => void
  positionSizeType: PositionSizeType
  onPositionSizeTypeChange: (type: PositionSizeType) => void
  positionSizeValue: number
  onPositionSizeValueChange: (value: number) => void
  slippageTolerance: number
  onSlippageToleranceChange: (value: number) => void
  maxGasFee: number
  onMaxGasFeeChange: (value: number) => void
}

export function StrategyExecutionSettings({
  pairLabel,
  executionEnabled,
  onExecutionEnabledChange,
  positionSizeType,
  onPositionSizeTypeChange,
  positionSizeValue,
  onPositionSizeValueChange,
  slippageTolerance,
  onSlippageToleranceChange,
  maxGasFee,
  onMaxGasFeeChange,
}: StrategyExecutionSettingsProps) {
  return (
    <div className="space-y-3 border border-[#1f1f1f] rounded-md p-3 bg-[#101010]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-200 font-medium">Enable Auto-Trading</p>
          <p className="text-[11px] text-gray-500">Execute {pairLabel} strategies via x402 + 1inch</p>
        </div>
        <input
          type="checkbox"
          checked={executionEnabled}
          onChange={(event) => onExecutionEnabledChange(event.target.checked)}
          className="h-4 w-4 accent-emerald-500"
        />
      </div>

      {executionEnabled && (
        <div className="space-y-3">
          <div className="space-y-2">
            <label className="text-xs text-gray-300 font-medium">Position Size</label>
            <div className="grid grid-cols-2 gap-2">
              <Select value={positionSizeType} onValueChange={(value: PositionSizeType) => onPositionSizeTypeChange(value)}>
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed_usd">Fixed USD</SelectItem>
                  <SelectItem value="percentage">Portfolio %</SelectItem>
                </SelectContent>
              </Select>
              <input
                type="number"
                min={positionSizeType === 'percentage' ? 0 : 1}
                max={positionSizeType === 'percentage' ? 100 : undefined}
                step={positionSizeType === 'percentage' ? 1 : 25}
                value={positionSizeValue}
                onChange={(event) => {
                  const next = Number(event.target.value)
                  onPositionSizeValueChange(Number.isFinite(next) ? next : 0)
                }}
                className="w-full rounded-md border border-[#1f1f1f] bg-[#0c0c0c] p-2 text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-emerald-400"
              />
            </div>
            <p className="text-[11px] text-gray-500">
              {positionSizeType === 'fixed_usd'
                ? `Allocate $${positionSizeValue.toLocaleString()} of ${pairLabel}`
                : `Allocate ${positionSizeValue}% of available capital`}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-gray-300 font-medium">Slippage Tolerance ({slippageTolerance.toFixed(2)}%)</label>
            <input
              type="range"
              min={0.1}
              max={3}
              step={0.1}
              value={slippageTolerance}
              onChange={(event) => onSlippageToleranceChange(Number(event.target.value))}
              className="w-full"
            />
            <p className="text-[11px] text-gray-500">Maximum price deviation during swap execution.</p>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-gray-300 font-medium">Max Gas Fee (MATIC)</label>
            <input
              type="number"
              min={0.01}
              step={0.01}
              value={maxGasFee}
              onChange={(event) => {
                const next = Number(event.target.value)
                onMaxGasFeeChange(Number.isFinite(next) ? next : 0)
              }}
              className="w-full rounded-md border border-[#1f1f1f] bg-[#0c0c0c] p-2 text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-emerald-400"
            />
            <p className="text-[11px] text-gray-500">Upper bound on gas expenditure per execution.</p>
          </div>
        </div>
      )}
    </div>
  )
}

"use client"

import { useState } from "react"
import { Button } from "./ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { IndicatorConfig } from "./strategy-builder"
import { Plus, X } from "lucide-react"

interface IndicatorSelectorProps {
  indicators: IndicatorConfig[]
  onChange: (indicators: IndicatorConfig[]) => void
}

const AVAILABLE_INDICATORS = [
  {
    name: 'RSI',
    description: 'Relative Strength Index',
    defaultParams: { period: 14, overbought: 70, oversold: 30 }
  },
  {
    name: 'MACD',
    description: 'Moving Average Convergence Divergence',
    defaultParams: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 }
  },
  {
    name: 'SMA',
    description: 'Simple Moving Average',
    defaultParams: { period: 20 }
  },
  {
    name: 'EMA',
    description: 'Exponential Moving Average',
    defaultParams: { period: 20 }
  },
  {
    name: 'Bollinger Bands',
    description: 'Bollinger Bands',
    defaultParams: { period: 20, stdDev: 2 }
  },
  {
    name: 'Stochastic',
    description: 'Stochastic Oscillator',
    defaultParams: { kPeriod: 14, dPeriod: 3 }
  }
]

const CONDITION_OPTIONS = [
  { value: 'above', label: 'Above Threshold' },
  { value: 'below', label: 'Below Threshold' },
  { value: 'crosses', label: 'Crosses Level' },
  { value: 'divergence', label: 'Shows Divergence' }
]

export function IndicatorSelector({ indicators, onChange }: IndicatorSelectorProps) {
  const [showAddIndicator, setShowAddIndicator] = useState(false)
  const [selectedIndicator, setSelectedIndicator] = useState<string>('')

  const addIndicator = () => {
    if (!selectedIndicator) return

    const indicatorTemplate = AVAILABLE_INDICATORS.find(ind => ind.name === selectedIndicator)
    if (!indicatorTemplate) return

    const newIndicator: IndicatorConfig = {
      name: selectedIndicator,
      enabled: true,
      parameters: { ...indicatorTemplate.defaultParams },
      condition: 'above',
      threshold: 50
    }

    onChange([...indicators, newIndicator])
    setSelectedIndicator('')
    setShowAddIndicator(false)
  }

  const removeIndicator = (index: number) => {
    const updated = indicators.filter((_, i) => i !== index)
    onChange(updated)
  }

  const updateIndicator = (index: number, updates: Partial<IndicatorConfig>) => {
    const updated = indicators.map((ind, i) => 
      i === index ? { ...ind, ...updates } : ind
    )
    onChange(updated)
  }

  const toggleIndicator = (index: number) => {
    updateIndicator(index, { enabled: !indicators[index].enabled })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs text-gray-300 font-medium">Technical Indicators</label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowAddIndicator(!showAddIndicator)}
          className="h-6 px-2 text-xs"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add
        </Button>
      </div>

      {/* Add Indicator Dropdown */}
      {showAddIndicator && (
        <div className="flex gap-2">
          <Select value={selectedIndicator} onValueChange={setSelectedIndicator}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select indicator..." />
            </SelectTrigger>
            <SelectContent>
              {AVAILABLE_INDICATORS.map((indicator) => (
                <SelectItem key={indicator.name} value={indicator.name}>
                  <div>
                    <div className="font-medium">{indicator.name}</div>
                    <div className="text-xs text-gray-500">{indicator.description}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            size="sm"
            onClick={addIndicator}
            disabled={!selectedIndicator}
            className="h-8 px-3"
          >
            Add
          </Button>
        </div>
      )}

      {/* Selected Indicators */}
      <div className="space-y-2 max-h-40 overflow-y-auto">
        {indicators.map((indicator, index) => (
          <div
            key={index}
            className={`p-3 rounded-md border ${
              indicator.enabled 
                ? 'border-blue-400/40 bg-blue-500/10' 
                : 'border-gray-600/40 bg-gray-500/10'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={indicator.enabled}
                  onChange={() => toggleIndicator(index)}
                  className="rounded border-gray-600 bg-transparent"
                />
                <span className="text-sm font-medium text-white">{indicator.name}</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeIndicator(index)}
                className="h-6 w-6 p-0 text-gray-400 hover:text-red-400"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>

            {indicator.enabled && (
              <div className="space-y-2">
                {/* Condition Selection */}
                <div>
                  <label className="text-xs text-gray-400">Condition</label>
                  <Select
                    value={indicator.condition}
                    onValueChange={(value: any) => updateIndicator(index, { condition: value })}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONDITION_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Threshold Input */}
                {(indicator.condition === 'above' || indicator.condition === 'below') && (
                  <div>
                    <label className="text-xs text-gray-400">Threshold</label>
                    <input
                      type="number"
                      value={indicator.threshold || ''}
                      onChange={(e) => updateIndicator(index, { threshold: parseFloat(e.target.value) })}
                      className="w-full h-7 px-2 text-xs bg-transparent border border-gray-600 rounded"
                      placeholder="Enter threshold..."
                    />
                  </div>
                )}

                {/* Parameters */}
                <div>
                  <label className="text-xs text-gray-400">Parameters</label>
                  <div className="text-xs text-gray-500 mt-1">
                    {Object.entries(indicator.parameters).map(([key, value]) => (
                      <span key={key} className="mr-2">
                        {key}: {value}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {indicators.length === 0 && (
        <p className="text-xs text-gray-500 text-center py-2">
          No indicators selected. Add indicators to create strategy conditions.
        </p>
      )}
    </div>
  )
}

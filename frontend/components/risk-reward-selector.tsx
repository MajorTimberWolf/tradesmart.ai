"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"

interface RiskRewardSelectorProps {
  value: string
  onChange: (value: string) => void
}

const RISK_REWARD_OPTIONS = [
  { value: '1:1', label: '1:1 (Conservative)', description: 'Equal risk and reward' },
  { value: '1:1.5', label: '1:1.5 (Moderate)', description: '1.5x reward for 1x risk' },
  { value: '1:2', label: '1:2 (Balanced)', description: '2x reward for 1x risk' },
  { value: '1:2.5', label: '1:2.5 (Aggressive)', description: '2.5x reward for 1x risk' },
  { value: '1:3', label: '1:3 (High Risk)', description: '3x reward for 1x risk' },
  { value: '1:4', label: '1:4 (Very High Risk)', description: '4x reward for 1x risk' },
  { value: '1:5', label: '1:5 (Extreme Risk)', description: '5x reward for 1x risk' },
  { value: 'custom', label: 'Custom Ratio', description: 'Set your own risk-reward ratio' }
]

export function RiskRewardSelector({ value, onChange }: RiskRewardSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-xs text-gray-300 font-medium">Risk-Reward Ratio</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {RISK_REWARD_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <div>
                <div className="font-medium">{option.label}</div>
                <div className="text-xs text-gray-500">{option.description}</div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {value === 'custom' && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-400">Risk</label>
              <input
                type="number"
                placeholder="1"
                className="w-full h-7 px-2 text-xs bg-transparent border border-gray-600 rounded"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400">Reward</label>
              <input
                type="number"
                placeholder="2"
                className="w-full h-7 px-2 text-xs bg-transparent border border-gray-600 rounded"
              />
            </div>
          </div>
          <p className="text-xs text-gray-500">
            Enter your desired risk and reward multipliers
          </p>
        </div>
      )}
      
      {value !== 'custom' && (
        <p className="text-xs text-gray-500">
          {RISK_REWARD_OPTIONS.find(opt => opt.value === value)?.description}
        </p>
      )}
    </div>
  )
}

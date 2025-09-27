"use client"

export type TimeInterval = '1' | '5' | '15' | '30' | '60' | 'D'

export interface TimeIntervalConfig {
  label: string
  value: TimeInterval
  description: string
}

interface TimeIntervalFiltersProps {
  selectedInterval: TimeInterval
  onIntervalChange: (interval: TimeInterval) => void
}

export default function TimeIntervalFilters({ 
  selectedInterval, 
  onIntervalChange 
}: TimeIntervalFiltersProps) {
  const timeIntervals: TimeIntervalConfig[] = [
    { label: '1M', value: '1', description: '1 minute' },
    { label: '5M', value: '5', description: '5 minutes' },
    { label: '15M', value: '15', description: '15 minutes' },
    { label: '30M', value: '30', description: '30 minutes' },
    { label: '1H', value: '60', description: '1 hour' },
    { label: '1D', value: 'D', description: '1 day' }
  ]

  return (
    <div className="flex items-center space-x-2 mb-4">
      <span className="text-sm text-gray-400 mr-2">Timeframe:</span>
      {timeIntervals.map((interval) => (
        <button
          key={interval.value}
          onClick={() => onIntervalChange(interval.value)}
          title={interval.description}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors duration-200 ${
            selectedInterval === interval.value
              ? 'bg-purple-600 text-white shadow-md' // ✅ highlight with purple
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white border border-gray-600'
          }`}
        >
          {interval.label}
        </button>
      ))}
    </div>
  )
}

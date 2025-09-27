"use client"

interface PriceHeaderProps {
  symbol: string
  currentPrice?: number | null
  priceChange?: number
  isLoading?: boolean
}

export default function PriceHeader({ 
  symbol, 
  currentPrice, 
  priceChange = 0,
  isLoading = false 
}: PriceHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <h2 className="text-2xl font-bold text-white">{symbol}</h2>
        {currentPrice && !isLoading && (
          <div className="flex items-center space-x-2">
            <span className="text-3xl font-bold text-white">
              ${currentPrice.toLocaleString()}
            </span>
            <span className={`text-lg font-semibold ${
              priceChange >= 0 ? "text-green-500" : "text-red-500"
            }`}>
              {priceChange >= 0 ? "+" : ""}{priceChange.toFixed(2)}%
            </span>
          </div>
        )}
        {isLoading && (
          <div className="flex items-center space-x-2">
            <div className="animate-pulse bg-gray-600 h-8 w-32 rounded"></div>
            <div className="animate-pulse bg-gray-600 h-6 w-16 rounded"></div>
          </div>
        )}
      </div>
      <div className="text-sm text-gray-400">
        Powered by Pyth Network
      </div>
    </div>
  )
}

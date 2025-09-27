"use client"

import { cn } from "@/lib/utils"

interface PriceHeaderProps {
  symbol: string
  currentPrice: number | null
  priceChange: number | null
  isLoading?: boolean
  className?: string
}

function formatPrice(value: number | null) {
  if (value === null) return "—"
  if (value >= 1000) {
    return value.toLocaleString(undefined, { maximumFractionDigits: 0 })
  }
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

function formatChange(value: number | null) {
  if (value === null) return "—"
  const formatted = Math.abs(value).toFixed(2)
  const sign = value > 0 ? "+" : value < 0 ? "-" : ""
  return `${sign}${formatted}%`
}

export default function PriceHeader({
  symbol,
  currentPrice,
  priceChange,
  isLoading = false,
  className
}: PriceHeaderProps) {
  const changeClass = priceChange === null
    ? "text-muted-foreground"
    : priceChange >= 0
      ? "text-emerald-400"
      : "text-red-400"

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg border border-border/60 bg-card/60 px-4 py-3",
        className
      )}
    >
      <div>
        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{symbol}</div>
        <div className="text-2xl font-semibold text-white">
          {isLoading ? (
            <span className="inline-flex h-6 w-28 animate-pulse rounded bg-muted/40" />
          ) : (
            formatPrice(currentPrice)
          )}
        </div>
      </div>

      <div className="text-right">
        <div className="text-xs text-muted-foreground">24h Change</div>
        <div className={cn("text-lg font-medium", changeClass)}>
          {isLoading ? (
            <span className="inline-flex h-4 w-16 animate-pulse rounded bg-muted/40" />
          ) : (
            formatChange(priceChange)
          )}
        </div>
      </div>
    </div>
  )
}

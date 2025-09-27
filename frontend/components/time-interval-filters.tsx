"use client"

import { Button } from "./ui/button"

const INTERVAL_OPTIONS = [
  { value: "1", label: "1m" },
  { value: "5", label: "5m" },
  { value: "15", label: "15m" },
  { value: "30", label: "30m" },
  { value: "60", label: "1h" },
  { value: "240", label: "4h" },
  { value: "1D", label: "1D" }
] as const

export type TimeInterval = (typeof INTERVAL_OPTIONS)[number]["value"]

type TimeIntervalFiltersProps = {
  selectedInterval: TimeInterval
  onIntervalChange: (interval: TimeInterval) => void
}

export default function TimeIntervalFilters({
  selectedInterval,
  onIntervalChange
}: TimeIntervalFiltersProps) {
  return (
    <div className="flex flex-wrap gap-1.5 rounded-lg border border-border/60 bg-card/60 p-1.5">
      {INTERVAL_OPTIONS.map(({ value, label }) => {
        const isSelected = selectedInterval === value
        return (
          <Button
            key={value}
            type="button"
            size="sm"
            variant={isSelected ? "default" : "ghost"}
            className={isSelected ? "bg-emerald-500 hover:bg-emerald-600 text-white" : "text-muted-foreground"}
            onClick={() => onIntervalChange(value)}
          >
            {label}
          </Button>
        )
      })}
    </div>
  )
}

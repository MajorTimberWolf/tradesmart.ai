import { Button } from "@/components/ui/button"
import { Settings, Globe } from "lucide-react"

export function TradingHeader() {
  return (
    <header className="h-16 border-b border-border bg-card flex items-center justify-between px-4">
      {/* Left section - Logo only */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-sm">H</span>
        </div>
        <span className="font-bold text-lg">Hyperliquid</span>
      </div>

      {/* Right section - Controls */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          className="bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-500"
        >
          Connect
        </Button>
        <Button variant="ghost" size="icon">
          <Globe className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon">
          <Settings className="w-4 h-4" />
        </Button>
      </div>
    </header>
  )
}

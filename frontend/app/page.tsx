import { TradingChart } from "@/components/trading-chart"
import { OrderBook } from "@/components/order-book"
import { MarketDataTables } from "@/components/market-data-tables"

export default function TradingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground dark">
      <div className="flex">
        {/* Left section - Main chart area taking up most space */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="h-[600px] min-h-[600px]">
            <TradingChart />
          </div>

          <div className="border-t border-border">
            <MarketDataTables />
          </div>
        </div>

        {/* Right sidebar - Order book with full height */}
        <div className="w-80 border-l border-border">
          <OrderBook />
        </div>
      </div>
    </div>
  )
}

"""RSI-based trading strategy implementation."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict

from backend.agent.config.settings import AgentSettings, get_settings
from backend.agent.core.strategies.strategy_base import Strategy, TradeSignal
from backend.agent.core.tools.price_fetcher import PriceFetcher, PriceData
from backend.agent.core.tools.rsi_calculator import RSICalculator


@dataclass
class MarketState:
    price: PriceData
    rsi: float


class RSIStrategy(Strategy):
    strategy_id = b"RSI_STRAT"

    def __init__(self, settings: AgentSettings | None = None, period: int | None = None) -> None:
        self.settings = settings or get_settings()
        self.period = period or self.settings.strategy.rsi_lookback_period
        self.rsi_calculator = RSICalculator(self.period)

    def collect_market_data(self, price_fetcher: PriceFetcher) -> MarketState:
        price = price_fetcher.fetch_price("ETH_USD")
        self.rsi_calculator.add_price(price.price)
        try:
            rsi_value = self.rsi_calculator.compute()
        except ValueError:
            rsi_value = 50.0
        return MarketState(price=price, rsi=rsi_value)

    def generate_signal(self, market_state: MarketState) -> TradeSignal:
        should_enter = market_state.rsi < self.settings.strategy.rsi_oversold
        return TradeSignal(
            should_enter=should_enter,
            from_token="0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",  # WETH on Sepolia
            to_token="0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8",    # USDC on Sepolia
            amount=1000000000000000000,  # 1 ETH in wei (18 decimals)
            expected_price=market_state.price.price,
            portfolio_value=10_000,
            position_size=2500,
            reason=None if should_enter else f"RSI {market_state.rsi:.2f} not below threshold",
            metadata={"rsi": market_state.rsi, "timestamp": market_state.price.publish_time},
        )

    def build_execution_params(self, signal: TradeSignal, quote: Any) -> Dict[str, Any]:
        return {
            "srcToken": signal.from_token,
            "dstToken": signal.to_token,
            "amount": signal.amount,
            "minReturn": int(signal.amount * 0.99),
            "txData": quote.tx_data,
        }



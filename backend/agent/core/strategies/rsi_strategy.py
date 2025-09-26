"""RSI-based trading strategy implementation."""

from __future__ import annotations

from dataclasses import dataclass
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
        rsi_value = self.rsi_calculator.compute()
        return MarketState(price=price, rsi=rsi_value)

    def generate_signal(self, market_state: MarketState) -> TradeSignal:
        should_enter = market_state.rsi < self.settings.strategy.rsi_oversold
        return TradeSignal(
            should_enter=should_enter,
            from_token="0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
            to_token="0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
            amount=1_000_000,
            expected_price=market_state.price.price,
            portfolio_value=10_000,
            position_size=2500,
        )

    def build_execution_params(self, signal: TradeSignal, quote: Any) -> Dict[str, Any]:
        return {
            "srcToken": signal.from_token,
            "dstToken": signal.to_token,
            "amount": signal.amount,
            "minReturn": int(signal.amount * 0.99),
            "txData": quote.tx_data,
        }



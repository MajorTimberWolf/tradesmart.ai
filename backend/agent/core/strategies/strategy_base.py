"""Base strategy definitions for trading agent."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol


class PriceFeed(Protocol):
    def fetch_price(self, symbol: str):
        ...


@dataclass
class TradeSignal:
    should_enter: bool
    from_token: str
    to_token: str
    amount: int
    expected_price: float
    portfolio_value: float
    position_size: float


class Strategy:
    strategy_id: bytes

    def collect_market_data(self, price_fetcher: PriceFeed) -> Any:
        raise NotImplementedError

    def generate_signal(self, market_state: Any) -> TradeSignal:
        raise NotImplementedError

    def build_execution_params(self, signal: TradeSignal, quote: Any) -> dict:
        raise NotImplementedError



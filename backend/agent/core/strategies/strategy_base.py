"""Base strategy definitions for trading agent."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Optional, Protocol


class PriceFeed(Protocol):
    def fetch_price(self, symbol: str):
        ...


@dataclass
class TradeSignal:
    should_enter: bool
    from_token: Optional[str] = None
    to_token: Optional[str] = None
    amount: int = 0
    expected_price: float = 0.0
    portfolio_value: float = 0.0
    position_size: float = 0.0
    reason: Optional[str] = None
    metadata: Optional[dict[str, Any]] = None


class Strategy:
    strategy_id: bytes

    def collect_market_data(self, price_fetcher: PriceFeed) -> Any:
        raise NotImplementedError

    def generate_signal(self, market_state: Any) -> TradeSignal:
        raise NotImplementedError

    def build_execution_params(self, signal: TradeSignal, quote: Any) -> dict:
        raise NotImplementedError



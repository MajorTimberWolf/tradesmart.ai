"""RSI calculation utility for trading strategies."""

from __future__ import annotations

from collections import deque
from typing import Deque, Iterable, List


class RSICalculator:
    """Calculates Relative Strength Index using Wilder's smoothing."""

    def __init__(self, period: int) -> None:
        if period <= 0:
            raise ValueError("RSI period must be positive")
        self.period = period
        self._prices: Deque[float] = deque(maxlen=period + 1)

    def add_price(self, price: float) -> None:
        self._prices.append(price)

    def compute(self) -> float:
        if len(self._prices) < self.period + 1:
            raise ValueError("Not enough data to compute RSI")

        gains: List[float] = []
        losses: List[float] = []

        prices = list(self._prices)
        for i in range(1, len(prices)):
            delta = prices[i] - prices[i - 1]
            if delta > 0:
                gains.append(delta)
                losses.append(0.0)
            else:
                gains.append(0.0)
                losses.append(abs(delta))

        avg_gain = sum(gains[-self.period :]) / self.period if gains else 0.0
        avg_loss = sum(losses[-self.period :]) / self.period if losses else 0.0

        if avg_loss == 0:
            return 100.0

        rs = avg_gain / avg_loss
        rsi = 100 - (100 / (1 + rs))
        return rsi

    @staticmethod
    def from_series(prices: Iterable[float], period: int) -> float:
        calculator = RSICalculator(period)
        for price in prices:
            calculator.add_price(price)
        return calculator.compute()



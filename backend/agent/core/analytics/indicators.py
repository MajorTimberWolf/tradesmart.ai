"""Technical indicators used by the analytics engine (e.g., RSI)."""

from __future__ import annotations

from typing import Iterable, List

from .ohlc import Candle


def _wilder_rsi_from_closes(closes: List[float], period: int = 14) -> List[float]:
    """Compute RSI series using Wilder's smoothing.

    Returns a list of RSI values aligned with closes. The first (period)
    entries will be `float('nan')` until enough data accumulates.
    """

    n = len(closes)
    rsi: List[float] = [float("nan")] * n
    if n == 0 or period <= 0 or n < period + 1:
        return rsi

    gains: List[float] = [0.0] * n
    losses: List[float] = [0.0] * n

    for i in range(1, n):
        delta = closes[i] - closes[i - 1]
        gains[i] = max(delta, 0.0)
        losses[i] = max(-delta, 0.0)

    # Initial averages (simple average of first `period` gains/losses)
    avg_gain = sum(gains[1 : period + 1]) / period
    avg_loss = sum(losses[1 : period + 1]) / period

    # First computable RSI value
    if avg_loss == 0:
        rsi[period] = 100.0
    else:
        rs = avg_gain / avg_loss
        rsi[period] = 100.0 - (100.0 / (1.0 + rs))

    # Wilder's smoothing for subsequent values
    for i in range(period + 1, n):
        avg_gain = (avg_gain * (period - 1) + gains[i]) / period
        avg_loss = (avg_loss * (period - 1) + losses[i]) / period
        if avg_loss == 0:
            rsi[i] = 100.0
        else:
            rs = avg_gain / avg_loss
            rsi[i] = 100.0 - (100.0 / (1.0 + rs))

    return rsi


def rsi_from_candles(candles: Iterable[Candle], period: int = 14) -> List[float]:
    closes = [c.close for c in candles]
    return _wilder_rsi_from_closes(closes, period=period)


__all__ = ["rsi_from_candles"]



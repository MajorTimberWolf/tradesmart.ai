"""Reversal point detection from 4h OHLC candles.

Identifies local maxima and minima where the price direction changes sign.
This is a simple, robust approach suitable for feeding band clustering.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import List, Literal, Optional

from .ohlc import Candle


ReversalKind = Literal["peak", "trough"]


@dataclass
class ReversalPoint:
    index: int
    timestamp: int
    price: float
    kind: ReversalKind
    magnitude_pct: float


def _is_peak(prev_close: float, curr_close: float, next_close: float) -> bool:
    # Prefer a strict change on one side to avoid flat plateaus triggering both
    return (curr_close > prev_close and curr_close >= next_close) or (
        curr_close >= prev_close and curr_close > next_close
    )


def _is_trough(prev_close: float, curr_close: float, next_close: float) -> bool:
    return (curr_close < prev_close and curr_close <= next_close) or (
        curr_close <= prev_close and curr_close < next_close
    )


def detect_reversals(
    candles: List[Candle],
    *,
    min_separation_bars: int = 1,
    min_price_move_pct: float = 0.0,
) -> List[ReversalPoint]:
    """Detect local peaks and troughs from a candle series.

    Parameters
    ----------
    min_separation_bars: minimum bars between consecutive reversals
    min_price_move_pct: minimum relative move from last pivot to accept (e.g., 0.005 for 0.5%)
    """

    n = len(candles)
    if n < 3:
        return []

    reversals: List[ReversalPoint] = []
    last_pivot_price: Optional[float] = None
    last_index: Optional[int] = None

    for i in range(1, n - 1):
        prev_c, c, next_c = candles[i - 1], candles[i], candles[i + 1]
        prev_close, close, next_close = prev_c.close, c.close, next_c.close

        kind: Optional[ReversalKind] = None
        if _is_peak(prev_close, close, next_close):
            kind = "peak"
        elif _is_trough(prev_close, close, next_close):
            kind = "trough"

        if kind is None:
            continue

        if last_index is not None and (i - last_index) < min_separation_bars:
            continue

        magnitude_pct = 0.0
        if last_pivot_price is not None and last_pivot_price > 0:
            magnitude_pct = abs(close - last_pivot_price) / last_pivot_price

        if magnitude_pct < min_price_move_pct and last_pivot_price is not None:
            continue

        reversals.append(
            ReversalPoint(
                index=i,
                timestamp=c.start_time,
                price=close,
                kind=kind,
                magnitude_pct=magnitude_pct,
            )
        )
        last_pivot_price = close
        last_index = i

    return reversals


__all__ = ["ReversalPoint", "detect_reversals"]



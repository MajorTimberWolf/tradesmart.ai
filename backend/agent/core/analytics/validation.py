"""Dataset validation utilities for OHLC candle series."""

from __future__ import annotations

from typing import Iterable

from .ohlc import Candle


def has_min_unique_datapoints(candles: Iterable[Candle], minimum_unique: int = 24) -> bool:
    prices = {c.close for c in candles}
    return len(prices) >= minimum_unique


def is_complete_window(candles: Iterable[Candle], expected_count: int) -> bool:
    return sum(1 for _ in candles) >= expected_count


def validate_candles(candles: Iterable[Candle], expected_count: int = 30, minimum_unique: int = 24) -> tuple[bool, list[str]]:
    """Return (ok, reasons) indicating dataset readiness for band detection."""
    reasons: list[str] = []
    seq = list(candles)
    # Accept synthetic backfill as valid for count, but require at least some real candles
    real_count = sum(1 for c in seq if not c.synthetic)
    if len(seq) < expected_count:
        reasons.append("insufficient_candles")
    if real_count == 0:
        reasons.append("no_real_candles")
    elif not has_min_unique_datapoints(seq, minimum_unique):
        reasons.append("insufficient_unique_prices")
    return (len(reasons) == 0, reasons)


__all__ = ["validate_candles", "has_min_unique_datapoints", "is_complete_window"]



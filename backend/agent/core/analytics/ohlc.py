"""OHLC aggregation utilities for Pyth price updates.

This module provides:
- A Candle dataclass representing a 4-hour OHLC bar
- Aggregation from raw Pyth updates to 4-hour candles
- Backfilling of missing candles using previous close
"""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Dict, Iterable, List, Tuple


FOUR_HOURS_SECONDS = 4 * 60 * 60  # 14,400


@dataclass
class Candle:
    start_time: int
    end_time: int
    open: float
    high: float
    low: float
    close: float
    count: int
    synthetic: bool = False


def _window_bounds(epoch_seconds: int) -> Tuple[int, int]:
    start = (epoch_seconds // FOUR_HOURS_SECONDS) * FOUR_HOURS_SECONDS
    end = start + FOUR_HOURS_SECONDS
    return start, end


def _to_float_price(price: int, expo: int) -> float:
    # Pyth prices use expo (power of ten) scaling; handle negatives
    scale = Decimal(10) ** Decimal(expo)
    return float(Decimal(price) * scale)


def aggregate_updates_to_4h_candles(
    updates: Iterable[Dict[str, int]],
    start_time: int,
    end_time: int,
) -> List[Candle]:
    """Aggregate parsed updates into contiguous 4-hour candles.

    Parameters
    ----------
    updates: Iterable of dicts with keys {"publish_time", "price", "expo"}
    start_time: inclusive lower bound for aggregation window (unix seconds)
    end_time: exclusive upper bound (unix seconds)
    """

    # Bucket updates by 4h window start
    buckets: Dict[int, List[Tuple[int, float]]] = {}
    for item in updates:
        ts = int(item["publish_time"])
        if ts < start_time or ts >= end_time:
            continue
        price_float = _to_float_price(int(item["price"]), int(item["expo"]))
        window_start, _ = _window_bounds(ts)
        buckets.setdefault(window_start, []).append((ts, price_float))

    # Build candles for every present bucket only (backfill handled separately)
    candles: List[Candle] = []
    for window_start, entries in sorted(buckets.items(), key=lambda kv: kv[0]):
        window_end = window_start + FOUR_HOURS_SECONDS
        # Sort entries chronologically
        entries.sort(key=lambda t: t[0])
        prices = [p for _, p in entries]
        candles.append(
            Candle(
                start_time=window_start,
                end_time=window_end,
                open=prices[0],
                high=max(prices),
                low=min(prices),
                close=prices[-1],
                count=len(prices),
                synthetic=False,
            )
        )

    return candles


def backfill_missing_candles(
    candles: List[Candle],
    start_time: int,
    end_time: int,
) -> List[Candle]:
    """Fill missing 4-hour windows using last known close as O/H/L/C.

    Produces a full set of contiguous candles in [start_time, end_time).
    Synthetic candles have count=0 and synthetic=True.
    """

    # Index existing candles by window start for O(1) lookup
    by_start: Dict[int, Candle] = {c.start_time: c for c in candles}

    # Determine the first window aligned start
    first_start, _ = _window_bounds(start_time)
    if first_start < start_time:
        first_start += FOUR_HOURS_SECONDS

    full: List[Candle] = []
    last_close: float | None = None
    cursor = first_start

    # Ensure candles are sorted to track last_close correctly
    for c in sorted(candles, key=lambda x: x.start_time):
        if c.start_time >= first_start:
            break
        last_close = c.close

    while cursor < end_time:
        window_end = cursor + FOUR_HOURS_SECONDS
        existing = by_start.get(cursor)
        if existing is not None:
            full.append(existing)
            last_close = existing.close
        else:
            if last_close is None:
                # Seed with the first known candle's open if available
                if by_start:
                    first_known = by_start[min(by_start.keys())]
                    last_close = first_known.open
                else:
                    # No data at all
                    cursor = window_end
                    continue
            full.append(
                Candle(
                    start_time=cursor,
                    end_time=window_end,
                    open=last_close,
                    high=last_close,
                    low=last_close,
                    close=last_close,
                    count=0,
                    synthetic=True,
                )
            )
        cursor = window_end

    return full


__all__ = ["Candle", "aggregate_updates_to_4h_candles", "backfill_missing_candles"]


def build_full_4h_candles(
    updates: Iterable[Dict[str, int]],
    start_time: int,
    end_time: int,
) -> List[Candle]:
    """Aggregate and backfill to return a contiguous 4h candle series.

    Convenience wrapper to produce a complete sequence in one call.
    """

    updates_list = list(updates)
    if not updates_list:
        return []
    aggregated = aggregate_updates_to_4h_candles(updates_list, start_time, end_time)
    return backfill_missing_candles(aggregated, start_time, end_time)




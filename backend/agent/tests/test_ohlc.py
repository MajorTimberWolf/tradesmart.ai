from backend.agent.core.analytics.ohlc import (
    Candle,
    aggregate_updates_to_4h_candles,
    backfill_missing_candles,
    build_full_4h_candles,
)


def test_aggregate_updates_to_4h_candles_basic() -> None:
    start = 0
    end = start + 4 * 60 * 60
    updates = [
        {"publish_time": start + 10, "price": 1000, "expo": -2},
        {"publish_time": start + 100, "price": 1200, "expo": -2},
        {"publish_time": start + 200, "price": 900, "expo": -2},
        {"publish_time": start + 300, "price": 1100, "expo": -2},
    ]

    candles = aggregate_updates_to_4h_candles(updates, start, end)

    assert len(candles) == 1
    candle = candles[0]
    assert candle.open == 10.0
    assert candle.high == 12.0
    assert candle.low == 9.0
    assert candle.close == 11.0
    assert candle.count == 4


def test_backfill_missing_candles() -> None:
    start = 0
    end = start + (4 * 60 * 60) * 3
    existing = [
        Candle(start, start + 4 * 60 * 60, 100.0, 110.0, 90.0, 105.0, 4),
        Candle(start + 2 * 4 * 60 * 60, start + 3 * 4 * 60 * 60, 106.0, 115.0, 95.0, 100.0, 5),
    ]

    full = backfill_missing_candles(existing, start, end)

    assert len(full) == 3
    assert full[1].synthetic
    assert full[1].open == full[0].close == 105.0
    assert full[2].close == 100.0


def test_build_full_4h_candles_empty_updates() -> None:
    candles = build_full_4h_candles([], 0, 4 * 60 * 60)
    assert candles == []


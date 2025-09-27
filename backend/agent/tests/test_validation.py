from backend.agent.core.analytics.ohlc import Candle
from backend.agent.core.analytics.validation import validate_candles


def test_validate_candles_passes_with_real_and_synthetic() -> None:
    candles = [
        Candle(0, 1, 100.0, 110.0, 90.0, 105.0, 5, synthetic=False),
    ]
    candles.extend(
        Candle(i, i + 1, 105.0, 105.0, 105.0, 105.0, 0, synthetic=True) for i in range(1, 30)
    )

    ok, reasons = validate_candles(candles, expected_count=30, minimum_unique=5)
    assert ok
    assert reasons == []


def test_validate_candles_insufficient_unique_prices() -> None:
    candles = [
        Candle(i, i + 1, 100.0, 100.0, 100.0, 100.0, 1, synthetic=False) for i in range(30)
    ]

    ok, reasons = validate_candles(candles, expected_count=30, minimum_unique=5)
    assert not ok
    assert "insufficient_unique_prices" in reasons


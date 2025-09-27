from backend.agent.core.analytics.ohlc import Candle
from backend.agent.core.analytics.reversals import detect_reversals


def test_detect_reversals_identifies_peaks_and_troughs() -> None:
    candles = [
        Candle(0, 1, 0, 0, 0, close, 1) for close in [100.0, 105.0, 95.0, 110.0, 90.0]
    ]

    reversals = detect_reversals(candles, min_separation_bars=1, min_price_move_pct=0.0)

    kinds = [r.kind for r in reversals]
    assert "peak" in kinds
    assert "trough" in kinds


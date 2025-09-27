from backend.agent.core.analytics.bands import Band
from backend.agent.core.analytics.reversals import ReversalPoint
from backend.agent.core.analytics.risk_reward import compute_rr_suggestions


def _band(mid: float, band_type: str) -> Band:
    return Band(
        lower=mid * 0.99,
        upper=mid * 1.01,
        mid=mid,
        points=[ReversalPoint(index=0, price=mid, kind="trough" if band_type == "support" else "peak", magnitude_pct=0.1, timestamp=0)],
        band_type=band_type,
        touch_count=1,
        avg_bounce_distance=0.0,
        last_touch_ts=0,
    )


def test_compute_rr_suggestions_returns_for_both_types() -> None:
    bands = [_band(100.0, "support"), _band(120.0, "resistance")]

    suggestions = compute_rr_suggestions(bands, max_position_pct=0.2)

    assert len(suggestions) == 2
    assert suggestions[0].band_type == "support"
    assert suggestions[0].position_pct == 0.2


from backend.agent.core.analytics.bands import (
    Band,
    cluster_reversals,
    rank_bands,
    build_bands,
)
from backend.agent.core.analytics.reversals import ReversalPoint


def _make_reversal(index: int, price: float, kind: str, timestamp: int = 0) -> ReversalPoint:
    return ReversalPoint(index=index, price=price, kind=kind, magnitude_pct=0.01, timestamp=timestamp)


def test_cluster_reversals_groups_by_price() -> None:
    points = [
        _make_reversal(0, 100.0, "peak"),
        _make_reversal(1, 100.5, "trough"),
        _make_reversal(2, 110.0, "peak"),
    ]

    clusters = cluster_reversals(points, tolerance_pct=0.01)

    assert len(clusters) == 2
    assert len(clusters[0]) == 2


def test_rank_bands_orders_by_touch_and_recency() -> None:
    bands = [
        Band(lower=90.0, upper=110.0, mid=100.0, points=[], band_type="support", touch_count=3, avg_bounce_distance=1.0, last_touch_ts=1),
        Band(lower=95.0, upper=115.0, mid=105.0, points=[], band_type="support", touch_count=1, avg_bounce_distance=1.0, last_touch_ts=10),
    ]

    ranked = rank_bands(bands, top_n_per_type=1)

    assert len(ranked) == 1
    assert ranked[0].touch_count == 3


def test_build_bands_requires_alternating_touches() -> None:
    reversals = [
        _make_reversal(0, 100.0, "peak", 0),
        _make_reversal(1, 99.0, "trough", 1),
        _make_reversal(2, 100.5, "peak", 2),
        _make_reversal(3, 99.5, "trough", 3),
    ]

    bands = build_bands(reversals, tolerance_pct=0.02, min_touches=3)

    assert len(bands) == 1
    band = bands[0]
    assert band.band_type in {"support", "resistance"}
    assert band.touch_count >= 3

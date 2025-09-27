"""Band clustering and metrics for support/resistance detection.

Clustering groups reversal points by price proximity using a tolerance
percentage of price. Bands require sufficient alternating touches and are
classified as support (last trough) or resistance (last peak).
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import timedelta
from typing import List, Literal, Optional, Tuple

from .reversals import ReversalPoint


BandType = Literal["support", "resistance"]


@dataclass
class Band:
    lower: float
    upper: float
    mid: float
    points: List[ReversalPoint]
    band_type: BandType
    touch_count: int
    avg_bounce_distance: float
    last_touch_ts: int
    projected_until_ts: Optional[int] = None


def _in_tolerance(a: float, b: float, tolerance_pct: float) -> bool:
    # Use symmetric tolerance around mid-price
    mid = (a + b) / 2.0
    width = mid * tolerance_pct
    return abs(a - b) <= width


def _merge_into_cluster(cluster: List[ReversalPoint], point: ReversalPoint, tolerance_pct: float) -> bool:
    prices = [p.price for p in cluster]
    lo, hi = min(prices), max(prices)
    # If point fits within tolerance band expanded by tolerance width, merge it
    if _in_tolerance(point.price, (lo + hi) / 2.0, tolerance_pct):
        cluster.append(point)
        return True
    return False


def cluster_reversals(reversals: List[ReversalPoint], tolerance_pct: float = 0.005) -> List[List[ReversalPoint]]:
    """Greedy single-pass clustering by price proximity.

    tolerance_pct: fraction of price (e.g., 0.005 = 0.5%).
    """

    if not reversals:
        return []

    # Sort by price then time for stable grouping
    sorted_points = sorted(reversals, key=lambda r: (r.price, r.timestamp))
    clusters: List[List[ReversalPoint]] = []

    for pt in sorted_points:
        placed = False
        for cluster in clusters:
            if _merge_into_cluster(cluster, pt, tolerance_pct):
                placed = True
                break
        if not placed:
            clusters.append([pt])

    # Ensure points within each cluster are chronologically ordered
    for cluster in clusters:
        cluster.sort(key=lambda r: r.timestamp)

    return clusters


def _has_alternating_touches(points: List[ReversalPoint]) -> bool:
    if len(points) < 2:
        return False
    for a, b in zip(points, points[1:]):
        if a.kind == b.kind:
            return False
    return True


def _classify_band(points: List[ReversalPoint]) -> BandType:
    # Classify by the kind of the last interaction
    last = points[-1]
    return "support" if last.kind == "trough" else "resistance"


def _band_bounds(points: List[ReversalPoint]) -> Tuple[float, float, float]:
    prices = [p.price for p in points]
    lo, hi = min(prices), max(prices)
    mid = (lo + hi) / 2.0
    return lo, hi, mid


def _avg_bounce_distance(points: List[ReversalPoint], mid: float) -> float:
    if not points:
        return 0.0
    return sum(abs(p.price - mid) for p in points) / len(points)


def build_bands(
    reversals: List[ReversalPoint],
    *,
    tolerance_pct: float = 0.005,
    min_touches: int = 3,
) -> List[Band]:
    clusters = cluster_reversals(reversals, tolerance_pct=tolerance_pct)
    bands: List[Band] = []
    for cluster in clusters:
        if len(cluster) < min_touches:
            continue
        if not _has_alternating_touches(cluster):
            continue
        lo, hi, mid = _band_bounds(cluster)
        band_type = _classify_band(cluster)
        avg_bounce = _avg_bounce_distance(cluster, mid)
        last_ts = max(p.timestamp for p in cluster)
        bands.append(
            Band(
                lower=lo,
                upper=hi,
                mid=mid,
                points=cluster,
                band_type=band_type,
                touch_count=len(cluster),
                avg_bounce_distance=avg_bounce,
                last_touch_ts=last_ts,
            )
        )
    return bands


def rank_bands(bands: List[Band], *, top_n_per_type: int = 3) -> List[Band]:
    """Return top bands per type by simple score: touches + recency weight."""
    if not bands:
        return []
    # Normalize recency over the set
    max_ts = max(b.last_touch_ts for b in bands)
    min_ts = min(b.last_touch_ts for b in bands)
    span = max(1, max_ts - min_ts)

    def score(b: Band) -> float:
        recency = (b.last_touch_ts - min_ts) / span
        return b.touch_count + 0.5 * recency

    best: List[Band] = []
    for band_type in ("support", "resistance"):
        filtered = [b for b in bands if b.band_type == band_type]
        filtered.sort(key=score, reverse=True)
        best.extend(filtered[:top_n_per_type])
    # Sort overall by type then recency desc
    best.sort(key=lambda b: (b.band_type, -b.last_touch_ts))
    return best


def project_bands(bands: List[Band], *, projection_hours: int = 72) -> List[Band]:
    if projection_hours <= 0:
        return bands
    delta = int(timedelta(hours=projection_hours).total_seconds())
    for b in bands:
        b.projected_until_ts = b.last_touch_ts + delta
    return bands


__all__ = [
    "Band",
    "build_bands",
    "rank_bands",
    "project_bands",
    "cluster_reversals",
    "_band_bounds",
]



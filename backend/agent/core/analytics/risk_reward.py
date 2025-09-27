"""Risk/Reward calculations and simple position sizing guidance."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, List, Optional

from backend.agent.core.analytics.bands import Band


@dataclass
class RRSuggestion:
    band_type: str
    entry_price: float
    stop_price: float
    take_profit_price: float
    risk: float
    reward: float
    rr_ratio: float
    recommended_position_pct: float
    target_band_mid: Optional[float] = None


def _nearest_opposite_band(band: Band, others: Iterable[Band]) -> Optional[Band]:
    candidates = [b for b in others if b.band_type != band.band_type]
    if not candidates:
        return None
    # Choose the closest by mid-price distance
    return min(candidates, key=lambda b: abs(b.mid - band.mid))


def compute_rr_suggestions(
    bands: List[Band],
    *,
    entry_at: str = "mid",  # or "lower" for support, "upper" for resistance
    stop_buffer_pct: float = 0.001,  # 0.1% beyond the band boundary
    max_position_pct: float = 0.25,  # default from settings
) -> List[RRSuggestion]:
    """Compute basic R:R suggestions using nearest opposite band as target.

    - For support bands, entry is at mid (or lower), stop below lower, target at nearest resistance mid
    - For resistance bands, entry is at mid (or upper), stop above upper, target at nearest support mid
    """

    suggestions: List[RRSuggestion] = []
    for band in bands:
        opposite = _nearest_opposite_band(band, bands)
        if opposite is None:
            continue

        if band.band_type == "support":
            entry = band.lower if entry_at == "lower" else band.mid
            stop = band.lower * (1.0 - stop_buffer_pct)
            take_profit = opposite.mid
            risk = max(0.0, entry - stop)
            reward = max(0.0, take_profit - entry)
        else:  # resistance
            entry = band.upper if entry_at == "upper" else band.mid
            stop = band.upper * (1.0 + stop_buffer_pct)
            take_profit = opposite.mid
            risk = max(0.0, stop - entry)
            reward = max(0.0, entry - take_profit)

        rr = (reward / risk) if risk > 0 else float("inf")

        suggestions.append(
            RRSuggestion(
                band_type=band.band_type,
                entry_price=entry,
                stop_price=stop,
                take_profit_price=take_profit,
                risk=risk,
                reward=reward,
                rr_ratio=rr,
                recommended_position_pct=max_position_pct,
                target_band_mid=opposite.mid,
            )
        )

    return suggestions


__all__ = ["RRSuggestion", "compute_rr_suggestions"]



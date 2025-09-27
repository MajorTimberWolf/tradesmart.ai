"""Support/Resistance analysis service producing a strategy payload.

Pipeline:
- Resolve Pyth price ID for the requested symbol
- Fetch last 5 days of updates via Hermes and aggregate into 4h candles
- Validate dataset, detect reversals, cluster into bands, rank and project
- Compute RSI and basic risk/reward suggestions
"""

from __future__ import annotations

from dataclasses import asdict
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from backend.agent.config.settings import AgentSettings, get_settings
from backend.agent.core.analytics.indicators import rsi_from_candles
from backend.agent.core.analytics.ohlc import Candle, build_full_4h_candles
from backend.agent.core.analytics.reversals import detect_reversals
from backend.agent.core.analytics.bands import Band, build_bands, project_bands, rank_bands
from backend.agent.core.analytics.validation import validate_candles
from backend.agent.core.analytics.risk_reward import RRSuggestion, compute_rr_suggestions
from backend.agent.services.historical_prices import HistoricalPriceFetcher


class SupportResistanceRequest(BaseModel):
    symbol: str = Field(..., description="Symbol key matching configured Pyth IDs, e.g., ETH_USD")
    tolerance_pct: float = Field(0.005, description="Band price clustering tolerance (e.g., 0.005 = 0.5%)")
    min_touches: int = Field(3, ge=2)
    top_n_per_type: int = Field(3, ge=1)
    projection_hours: int = Field(72, ge=0)
    rsi_period: int = Field(14, ge=2)


class BandOut(BaseModel):
    type: str
    lower: float
    upper: float
    mid: float
    touchCount: int
    avgBounce: float
    lastTouch: int
    projectedUntil: Optional[int] = None


class RROut(BaseModel):
    bandType: str
    entry: float
    stop: float
    takeProfit: float
    risk: float
    reward: float
    rr: float
    positionPct: float
    targetBandMid: Optional[float] = None


class SupportResistanceResponse(BaseModel):
    asset: str
    priceId: str
    generatedAt: str
    bands: List[BandOut]
    indicators: Dict[str, Any] = Field(default_factory=dict)
    jobId: Optional[str] = None


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


class SupportResistanceService:
    def __init__(self, settings: Optional[AgentSettings] = None) -> None:
        self._settings = settings or get_settings()
        self._history = HistoricalPriceFetcher(self._settings)

    def _resolve_price_id(self, symbol: str) -> str:
        price_id = self._settings.pyth.price_feed_ids.get(symbol)
        if not price_id:
            raise ValueError(f"No Pyth price ID configured for symbol '{symbol}'")
        return price_id

    def _window(self) -> tuple[int, int]:
        end = int(_now_utc().timestamp())
        start = end - int(timedelta(days=5).total_seconds())
        return start, end

    def build(self, request: SupportResistanceRequest) -> SupportResistanceResponse:
        price_id = self._resolve_price_id(request.symbol)
        start, end = self._window()

        # Fetch and aggregate
        updates = self._history.fetch_updates(price_id, start, end)
        candles = build_full_4h_candles([asdict(u) for u in updates], start, end)

        ok, reasons = validate_candles(candles, expected_count=30, minimum_unique=24)
        if not ok:
            raise ValueError(f"Dataset validation failed: {', '.join(reasons)}")

        reversals = detect_reversals(candles, min_separation_bars=1, min_price_move_pct=request.tolerance_pct)
        bands = build_bands(reversals, tolerance_pct=request.tolerance_pct, min_touches=request.min_touches)
        bands = rank_bands(bands, top_n_per_type=request.top_n_per_type)
        bands = project_bands(bands, projection_hours=request.projection_hours)

        # Indicators
        rsi_series = rsi_from_candles(candles, period=request.rsi_period)
        rsi_value = rsi_series[-1] if rsi_series else float("nan")

        rr = compute_rr_suggestions(bands, max_position_pct=float(self._settings.strategy.max_portfolio_exposure))

        return SupportResistanceResponse(
            asset=request.symbol.split("_")[0],
            priceId=price_id if price_id.startswith("0x") else f"0x{price_id}",
            generatedAt=_now_utc().isoformat(),
            bands=[_band_to_out(b) for b in bands],
            indicators={
                "rsi": {"value": rsi_value, "length": request.rsi_period},
                "riskReward": [_rr_to_out(x) for x in rr],
            },
        )


def _band_to_out(b: Band) -> BandOut:
    return BandOut(
        type=b.band_type,
        lower=b.lower,
        upper=b.upper,
        mid=b.mid,
        touchCount=b.touch_count,
        avgBounce=b.avg_bounce_distance,
        lastTouch=b.last_touch_ts,
        projectedUntil=b.projected_until_ts,
    )


def _rr_to_out(x: RRSuggestion) -> RROut:
    return RROut(
        bandType=x.band_type,
        entry=x.entry_price,
        stop=x.stop_price,
        takeProfit=x.take_profit_price,
        risk=x.risk,
        reward=x.reward,
        rr=x.rr_ratio,
        positionPct=x.recommended_position_pct,
        targetBandMid=x.target_band_mid,
    )


__all__ = [
    "SupportResistanceService",
    "SupportResistanceRequest",
    "SupportResistanceResponse",
]



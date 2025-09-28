"""Shared strategy configuration models for execution-aware workflows."""

from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field, ValidationInfo, field_validator


class TradingPairDecimals(BaseModel):
    base: int = Field(ge=0, description="Decimals for the base token")
    quote: int = Field(ge=0, description="Decimals for the quote token")


class TradingPair(BaseModel):
    id: str
    backend_symbol: str = Field(alias="backendSymbol")
    base_token: str = Field(alias="baseToken")
    quote_token: str = Field(alias="quoteToken")
    pyth_feed_id: str = Field(alias="pythFeedId")
    label: str
    decimals: TradingPairDecimals

    model_config = {
        "populate_by_name": True,
        "str_strip_whitespace": True,
    }


class PositionSize(BaseModel):
    type: Literal["fixed_usd", "percentage"]
    value: float = Field(gt=0)

    @field_validator("value")
    @classmethod
    def validate_value(cls, value: float, info: ValidationInfo) -> float:
        position_type = info.data.get("type")
        if position_type == "percentage" and value > 100:
            raise ValueError("percentage position size cannot exceed 100")
        return value


class ExecutionConfig(BaseModel):
    enabled: bool = False
    position_size: PositionSize = Field(alias="positionSize")
    slippage_tolerance: float = Field(alias="slippageTolerance", ge=0.1, le=10)
    max_gas_fee: float = Field(alias="maxGasFee", gt=0)

    model_config = {"populate_by_name": True}


class LiquidityLevel(BaseModel):
    type: Literal["support", "resistance"]
    price: float


class IndicatorConfig(BaseModel):
    name: str
    enabled: bool = True
    parameters: dict[str, object] = Field(default_factory=dict)
    condition: Literal["above", "below", "crosses", "divergence"]
    threshold: Optional[float] = None


class StrategyConfig(BaseModel):
    risk_reward_ratio: str = Field(alias="riskRewardRatio")
    indicators: list[IndicatorConfig]
    liquidity_level: LiquidityLevel = Field(alias="liquidityLevel")
    symbol: str
    timeframe: str
    trading_pair: TradingPair = Field(alias="tradingPair")
    execution: ExecutionConfig

    model_config = {"populate_by_name": True}

    @field_validator("indicators")
    @classmethod
    def ensure_indicator_present(cls, indicators: list[IndicatorConfig]) -> list[IndicatorConfig]:
        if not any(ind.enabled for ind in indicators):
            raise ValueError("At least one indicator must be enabled")
        return indicators


__all__ = [
    "ExecutionConfig",
    "IndicatorConfig",
    "LiquidityLevel",
    "PositionSize",
    "StrategyConfig",
    "TradingPair",
    "TradingPairDecimals",
]

"""Risk management toolkit for validating trade parameters."""

from __future__ import annotations

from dataclasses import dataclass

from backend.agent.config.settings import AgentSettings, get_settings


@dataclass
class RiskAssessment:
    is_acceptable: bool
    reason: str | None = None


class RiskManager:
    def __init__(self, settings: AgentSettings | None = None) -> None:
        self.settings = settings or get_settings()

    def validate_position_size(self, portfolio_value: float, position_value: float) -> RiskAssessment:
        max_exposure = float(self.settings.strategy.max_portfolio_exposure)
        if position_value > portfolio_value * max_exposure:
            return RiskAssessment(False, "Position exceeds max portfolio exposure")
        return RiskAssessment(True)

    def validate_slippage(self, expected_price: float, execution_price: float) -> RiskAssessment:
        slippage = abs(execution_price - expected_price) / expected_price * 10_000
        if slippage > self.settings.strategy.max_slippage_bps:
            return RiskAssessment(False, "Slippage exceeds configured threshold")
        return RiskAssessment(True)



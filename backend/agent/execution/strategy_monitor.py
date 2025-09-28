"""Helpers for loading execution-enabled strategies into monitoring jobs."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, List

from backend.agent.services.strategy_repository import StrategyRepository
from backend.agent.services.strategy_schema import StrategyConfig


@dataclass
class ExecutionPlan:
    strategy: StrategyConfig
    symbol: str
    pair_id: str


class ExecutionStrategyMonitor:
    """Coordinates between stored strategies and monitoring jobs.

    The initial version only prepares execution plans; follow-up work will
    convert these plans into concrete x402/1inch actions.
    """

    def __init__(self, repository: StrategyRepository | None = None) -> None:
        self._repository = repository or StrategyRepository()

    def load_execution_plans(self) -> List[ExecutionPlan]:
        plans: List[ExecutionPlan] = []
        for strategy in self._repository.list_enabled():
            pair = strategy.trading_pair
            plans.append(
                ExecutionPlan(
                    strategy=strategy,
                    symbol=pair.backend_symbol,
                    pair_id=pair.id,
                )
            )
        return plans

    def list_strategy_summaries(self) -> List[dict[str, object]]:
        summaries: List[dict[str, object]] = []
        for plan in self.load_execution_plans():
            execution = plan.strategy.execution
            summaries.append(
                {
                    "pair": plan.pair_id,
                    "symbol": plan.symbol,
                    "position": execution.position_size.model_dump(),
                    "slippage": execution.slippage_tolerance,
                    "maxGas": execution.max_gas_fee,
                }
            )
        return summaries


__all__ = ["ExecutionPlan", "ExecutionStrategyMonitor"]

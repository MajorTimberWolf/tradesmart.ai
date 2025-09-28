"""File-backed repository for storing execution-ready strategies."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Iterable, List

from pydantic import TypeAdapter

from backend.agent.config.settings import AgentSettings, get_settings
from .strategy_schema import StrategyConfig

_STRATEGY_FILENAME = "execution_strategies.json"


class StrategyRepository:
    """Simple JSON repository for storing StrategyConfig payloads."""

    def __init__(self, settings: AgentSettings | None = None) -> None:
        self._settings = settings or get_settings()
        base_path = Path(self._settings.persistence.sqlite_path).resolve().parent
        base_path.mkdir(parents=True, exist_ok=True)
        self._storage_path = base_path / _STRATEGY_FILENAME
        self._adapter: TypeAdapter[List[StrategyConfig]] = TypeAdapter(List[StrategyConfig])

    def list(self) -> list[StrategyConfig]:
        if not self._storage_path.exists():
            return []
        raw_text = self._storage_path.read_text(encoding="utf-8")
        if not raw_text.strip():
            return []
        payload = json.loads(raw_text)
        return self._adapter.validate_python(payload)

    def list_enabled(self) -> list[StrategyConfig]:
        return [item for item in self.list() if item.execution.enabled]

    def add(self, strategy: StrategyConfig) -> StrategyConfig:
        strategies = self.list()
        strategies.append(strategy)
        data = [item.model_dump(mode="json") for item in strategies]
        self._storage_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        return strategy

    def replace_all(self, strategies: Iterable[StrategyConfig]) -> None:
        data = [item.model_dump(mode="json") for item in strategies]
        self._storage_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


__all__ = ["StrategyRepository"]

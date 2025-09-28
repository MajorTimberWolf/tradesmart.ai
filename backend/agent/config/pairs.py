"""Utilities for accessing supported trading pairs and related metadata."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Iterable, Optional

from .constants import EXECUTION_SYMBOL_MAP


@dataclass(frozen=True)
class ExecutionPair:
    """Represents a tradeable pair backed by a Pyth feed and Polygon tokens."""

    id: str
    label: str
    backend_symbol: str
    pyth_feed_id: str
    base_token: str
    quote_token: str
    base_decimals: int
    quote_decimals: int


def _normalize_entry(pair_id: str, raw: Dict[str, object]) -> ExecutionPair:
    label = raw.get("label") or pair_id
    decimals = raw.get("decimals", {})
    return ExecutionPair(
        id=pair_id,
        label=str(label),
        backend_symbol=str(raw["pyth_symbol"]),
        pyth_feed_id=str(raw["pyth_feed_id"]),
        base_token=str(raw["base_token"]),
        quote_token=str(raw["quote_token"]),
        base_decimals=int(getattr(decimals, "get", lambda _x, default: default)("base", 18)),
        quote_decimals=int(getattr(decimals, "get", lambda _x, default: default)("quote", 18)),
    )


def get_execution_pair(pair_id: str) -> Optional[ExecutionPair]:
    raw = EXECUTION_SYMBOL_MAP.get(pair_id)
    if not raw:
        return None
    return _normalize_entry(pair_id, raw)


def list_execution_pairs() -> Iterable[ExecutionPair]:
    for pair_id, raw in EXECUTION_SYMBOL_MAP.items():
        yield _normalize_entry(pair_id, raw)


__all__ = [
    "ExecutionPair",
    "get_execution_pair",
    "list_execution_pairs",
]

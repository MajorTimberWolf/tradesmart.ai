"""Services for analyzing chart images with the LLM and persisting strategies."""

from __future__ import annotations

import base64
import uuid
from datetime import datetime, timezone
from pathlib import Path
import json
from typing import Any, Dict, List

from pydantic import BaseModel, Field, ValidationError

from backend.agent.config.settings import AgentSettings, get_settings
from backend.agent.services.openrouter_client import OpenRouterClient, OpenRouterError


class ChartAnalysisRequest(BaseModel):
    """Payload containing the chart image and metadata."""

    image_base64: str = Field(..., description="Base64-encoded PNG data URI or raw base64 string")
    symbol: str = Field(..., min_length=1)
    interval: str = Field(..., min_length=1)


class StrategyAction(BaseModel):
    label: str
    description: str


class StrategySuggestion(BaseModel):
    """Structured representation of a strategy produced by the LLM."""

    id: str
    strategy_key: str
    title: str
    summary: str
    support_level: float
    resistance_level: float
    confidence: float = Field(ge=0.0, le=1.0)
    actions: List[StrategyAction] = Field(default_factory=list)
    symbol: str
    interval: str
    created_at: datetime
    metadata: Dict[str, Any] = Field(default_factory=dict)


class StrategyStore:
    """Simple JSON-backed store for recently generated strategies."""

    def __init__(self, storage_path: Path, max_entries: int = 20) -> None:
        self._storage_path = storage_path
        self._max_entries = max_entries
        self._storage_path.parent.mkdir(parents=True, exist_ok=True)

    def list(self) -> List[StrategySuggestion]:
        if not self._storage_path.exists():
            return []
        raw = self._storage_path.read_text(encoding="utf-8")
        if not raw.strip():
            return []
        try:
            payload = json.loads(raw)
        except json.JSONDecodeError:
            return []
        if not isinstance(payload, list):
            return []
        suggestions: List[StrategySuggestion] = []
        for item in payload:
            if not isinstance(item, dict):
                continue
            try:
                suggestions.append(StrategySuggestion.model_validate(item))
            except ValidationError:
                continue
        return suggestions

    def add(self, suggestion: StrategySuggestion) -> None:
        existing = self.list()
        existing.append(suggestion)
        # Sort newest first and trim
        existing.sort(key=lambda s: s.created_at, reverse=True)
        trimmed = existing[: self._max_entries]
        payload = [item.model_dump(mode="json") for item in trimmed]
        self._storage_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


class ChartAnalysisService:
    """High-level orchestration for chart analysis and persistence."""

    def __init__(self, settings: AgentSettings | None = None) -> None:
        self._settings = settings or get_settings()
        storage_path = Path(self._settings.persistence.sqlite_path).with_name("strategy_suggestions.json")
        self._store = StrategyStore(storage_path)

    def list_strategies(self) -> List[StrategySuggestion]:
        return self._store.list()

    async def analyze(self, request: ChartAnalysisRequest) -> StrategySuggestion:
        image_payload = self._normalize_base64(request.image_base64)

        llm_payload = self._build_llm_payload(request, image_payload)
        try:
            client = OpenRouterClient(self._settings)
            llm_response = await client.generate_json(llm_payload)
        except OpenRouterError as exc:
            raise RuntimeError(str(exc)) from exc

        suggestion = self._parse_llm_response(llm_response, request)
        self._store.add(suggestion)
        return suggestion

    def _normalize_base64(self, data: str) -> str:
        if "," in data:
            data = data.split(",", 1)[1]
        # Validate base64
        try:
            base64.b64decode(data, validate=True)
        except Exception as exc:  # pragma: no cover - defensive
            raise ValueError("Invalid base64-encoded image data") from exc
        return data

    def _build_llm_payload(self, request: ChartAnalysisRequest, image_base64: str) -> Dict[str, Any]:
        json_schema = {
            "name": "ChartStrategySuggestion",
            "schema": {
                "type": "object",
                "properties": {
                    "strategy_key": {"type": "string"},
                    "title": {"type": "string"},
                    "summary": {"type": "string"},
                    "support_level": {"type": "number"},
                    "resistance_level": {"type": "number"},
                    "confidence": {"type": "number", "minimum": 0.0, "maximum": 1.0},
                    "actions": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "label": {"type": "string"},
                                "description": {"type": "string"},
                            },
                            "required": ["label", "description"],
                        },
                    },
                    "metadata": {
                        "type": "object",
                        "properties": {
                            "support_narrative": {"type": "string"},
                            "resistance_narrative": {"type": "string"},
                            "indicators": {"type": "object"},
                            "rect_start_timestamp": {"type": "number"},
                            "rect_end_timestamp": {"type": "number"},
                        },
                    },
                },
                "required": [
                    "strategy_key",
                    "title",
                    "summary",
                    "support_level",
                    "resistance_level",
                    "confidence",
                ],
            },
        }

        system_prompt = (
            "You are a quantitative trading assistant analyzing a crypto chart image from TradingView. "
            "Identify actionable strategies, focusing on RSI-style setups and clarity for human traders. "
            "Return concise JSON following the provided schema. Confidence should be between 0 and 1. "
            "Prefer naming schemes like 'RSI 20/80' or other standard technical strategy names."
        )

        user_prompt = (
            "Review the attached chart snapshot for {symbol} on the {interval} interval. "
            "Highlight the dominant support and resistance zones, summarise the market structure, "
            "and propose a concrete strategy the trader could execute. "
            "If no clear setup is visible, you may reduce confidence but still attempt a balanced suggestion."
        ).format(symbol=request.symbol, interval=request.interval)

        return {
            "model": self._settings.llm.model,
            "temperature": 0.2,
            "messages": [
                {"role": "system", "content": [{"type": "text", "text": system_prompt}]},
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": user_prompt},
                        {"type": "input_image", "image_base64": image_base64},
                    ],
                },
            ],
            "response_format": {"type": "json_schema", "json_schema": json_schema},
        }

    def _parse_llm_response(
        self, llm_response: Dict[str, Any], request: ChartAnalysisRequest
    ) -> StrategySuggestion:
        metadata = llm_response.get("metadata")
        metadata_dict = metadata if isinstance(metadata, dict) else {}

        support_level = self._safe_float(llm_response.get("support_level"))
        resistance_level = self._safe_float(llm_response.get("resistance_level"))
        confidence = self._safe_float(llm_response.get("confidence"), fallback=0.0)

        suggestion = StrategySuggestion(
            id=str(uuid.uuid4()),
            strategy_key=str(llm_response.get("strategy_key", "unknown_strategy")),
            title=str(llm_response.get("title", "Unnamed Strategy")),
            summary=str(llm_response.get("summary", "")),
            support_level=support_level,
            resistance_level=resistance_level,
            confidence=float(min(max(confidence, 0.0), 1.0)),
            actions=[
                StrategyAction(
                    label=str(action.get("label", "")),
                    description=str(action.get("description", "")),
                )
                for action in llm_response.get("actions", [])
                if isinstance(action, dict) and action.get("label")
            ],
            metadata={
                "source": "openrouter",
                "raw": llm_response,
                "support_narrative": metadata_dict.get("support_narrative"),
                "resistance_narrative": metadata_dict.get("resistance_narrative"),
                "rect_start_timestamp": metadata_dict.get("rect_start_timestamp"),
                "rect_end_timestamp": metadata_dict.get("rect_end_timestamp"),
            },
            symbol=request.symbol,
            interval=request.interval,
            created_at=datetime.now(timezone.utc),
        )
        return suggestion

    def _safe_float(self, value: Any, fallback: float = 0.0) -> float:
        try:
            return float(value)
        except (TypeError, ValueError):
            return fallback


__all__ = [
    "ChartAnalysisRequest",
    "ChartAnalysisService",
    "StrategyAction",
    "StrategySuggestion",
]

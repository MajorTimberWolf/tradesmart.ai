"""FastAPI server exposing chart analysis capabilities."""

from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from backend.agent.services.chart_analysis import (
    ChartAnalysisRequest,
    ChartAnalysisService,
    StrategySuggestion,
)

app = FastAPI(title="ERC8004 Agent Analysis API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

_analysis_service = ChartAnalysisService()


@app.get("/health")
async def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/analysis/chart", response_model=StrategySuggestion)
async def analyze_chart(request: ChartAnalysisRequest) -> StrategySuggestion:
    try:
        suggestion = await _analysis_service.analyze(request)
        return suggestion
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover - surface friendly message
        raise HTTPException(status_code=500, detail="Chart analysis failed") from exc


@app.get("/analysis/strategies", response_model=list[StrategySuggestion])
async def list_strategies() -> list[StrategySuggestion]:
    return _analysis_service.list_strategies()


__all__ = ["app"]

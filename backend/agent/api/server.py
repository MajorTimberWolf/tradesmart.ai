"""FastAPI server exposing chart analysis capabilities."""

from __future__ import annotations

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import asyncio
import json

from backend.agent.services.chart_analysis import (
    ChartAnalysisRequest,
    ChartAnalysisService,
    StrategySuggestion,
)
from backend.agent.services.support_resistance import (
    SupportResistanceRequest,
    SupportResistanceResponse,
    SupportResistanceService,
)
from backend.agent.services.strategy_schema import StrategyConfig
from backend.agent.services.strategy_repository import StrategyRepository
from backend.agent.execution.strategy_monitor import ExecutionStrategyMonitor
from backend.agent.execution.swap_planner import SwapPlanner
from backend.agent.core.tools.quote_fetcher import QuoteFetcher
from backend.agent.execution.job_runner import MonitoringJobs, WatchedBand
from backend.agent.api.event_bus import event_bus

app = FastAPI(title="ERC8004 Agent Analysis API", version="0.1.0")

@app.on_event("startup")
async def startup_event() -> None:
    event_bus.set_loop(asyncio.get_running_loop())

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

_analysis_service = ChartAnalysisService()
_sr_service = SupportResistanceService()
_jobs = MonitoringJobs()
_strategy_repo = StrategyRepository()
_execution_monitor = ExecutionStrategyMonitor(_strategy_repo)
_quote_fetcher = QuoteFetcher()
_swap_planner = SwapPlanner(quote_fetcher=_quote_fetcher)


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


@app.get("/api/strategies/execution", response_model=list[StrategyConfig])
async def list_execution_strategies() -> list[StrategyConfig]:
    return _strategy_repo.list()


@app.post("/api/strategies/execution", response_model=StrategyConfig, status_code=201)
async def create_execution_strategy(strategy: StrategyConfig) -> StrategyConfig:
    return _strategy_repo.add(strategy)


@app.get("/api/strategies/execution/summaries")
async def list_execution_strategy_summaries() -> list[dict[str, object]]:
    return _execution_monitor.list_strategy_summaries()


@app.get("/api/strategies/execution/plans")
async def list_execution_plans(portfolioUsd: float | None = None) -> list[dict[str, object]]:
    plans: list[dict[str, object]] = []
    execution_plans = _execution_monitor.load_execution_plans()
    for execution_plan in execution_plans:
        try:
            swap_plan = _swap_planner.plan(execution_plan, portfolioUsd)
        except Exception as exc:  # pragma: no cover - network/quote failures
            # Surface failure context for debugging while allowing others to proceed
            plans.append(
                {
                    "strategy": execution_plan.strategy.model_dump(mode="json"),
                    "error": str(exc),
                }
            )
            continue
        plans.append(swap_plan.to_dict())
    return plans


@app.get("/api/oneinch/tokens")
async def list_oneinch_tokens() -> dict[str, dict[str, str]]:
    return _quote_fetcher.list_tokens()


@app.post("/api/strategies/support-resistance", response_model=SupportResistanceResponse)
async def build_support_resistance(request: SupportResistanceRequest) -> SupportResistanceResponse:
    try:
        result = _sr_service.build(request)
        await event_bus.publish(
            {
                "type": "strategy.support_resistance.created",
                "payload": result.model_dump(mode="json"),
            }
        )
        # Kick off background monitoring for the returned bands
        watched = [
            WatchedBand(
                lower=b.lower,
                upper=b.upper,
                projected_until=b.projectedUntil,
                band_type=b.type,
            )
            for b in result.bands
        ]
        job_id = _jobs.start_band_watch(result.asset + "_USD", watched)
        result.jobId = job_id
    return result
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover - surface friendly message
        # Surface the exception string to aid debugging during development
        raise HTTPException(status_code=500, detail=f"Support/Resistance analysis failed: {exc}") from exc


@app.get("/api/events")
async def stream_events(request: Request) -> StreamingResponse:
    async def generator():
        async for event in event_bus.subscribe():
            if await request.is_disconnected():
                break
            data = json.dumps(event)
            yield f"data: {data}\n\n".encode("utf-8")

    headers = {
        "Cache-Control": "no-cache",
        "Content-Type": "text/event-stream",
        "Connection": "keep-alive",
    }
    return StreamingResponse(generator(), headers=headers)

__all__ = ["app"]

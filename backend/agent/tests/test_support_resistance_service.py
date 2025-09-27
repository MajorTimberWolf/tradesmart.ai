from datetime import timedelta
from typing import Dict, List
from unittest.mock import MagicMock

import pytest

from backend.agent.config.settings import AgentSettings
from backend.agent.services.support_resistance import SupportResistanceRequest, SupportResistanceService


@pytest.fixture
def settings() -> AgentSettings:
    settings = AgentSettings.model_construct()
    settings.pyth.price_feed_ids = {"ETH_USD": "0xff"}
    return settings


def _service_with_candles(settings: AgentSettings, candles: List[Candle]) -> SupportResistanceService:
    service = SupportResistanceService(settings=settings)
    service._history = MagicMock()
    service._history.fetch_updates.return_value = [{"publish_time": 0, "price": 1000, "expo": -2}] if candles else []
    service._price_fetcher = FakePriceFetcher(2000.0)
    return service


def test_support_resistance_build_returns_bands_from_candles(settings: AgentSettings) -> None:
    request = SupportResistanceRequest(symbol="ETH_USD")
    service = SupportResistanceService(settings=settings)
    updates = [
        {"publish_time": 0, "price": 1000, "expo": -2},
        {"publish_time": 4 * 60 * 60, "price": 1100, "expo": -2},
        {"publish_time": 8 * 60 * 60, "price": 900, "expo": -2},
        {"publish_time": 12 * 60 * 60, "price": 1150, "expo": -2},
    ]
    service._history = MagicMock()
    service._history.fetch_updates.return_value = updates
    service._price_fetcher = MagicMock()
    service._price_fetcher.fetch_price.return_value = MagicMock(price=2000.0)

    response = service.build(request)

    assert response.bands
    assert response.indicators["rsi"]["length"] == request.rsi_period


def test_support_resistance_build_handles_empty_updates(settings: AgentSettings) -> None:
    request = SupportResistanceRequest(symbol="ETH_USD")
    service = SupportResistanceService(settings=settings)
    service._history = MagicMock()
    service._history.fetch_updates.return_value = []
    service._price_fetcher = MagicMock()
    service._price_fetcher.fetch_price.return_value = MagicMock(price=2000.0)

    response = service.build(request)

    assert response.bands


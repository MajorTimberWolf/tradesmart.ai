"""Price fetching tool for integrating Pyth price feeds."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Optional

import httpx

from backend.agent.config.settings import AgentSettings, get_settings


@dataclass
class PriceData:
    """Structured price information returned by the price fetcher."""

    price: float
    confidence: float
    publish_time: int
    id: str


class PriceFetcher:
    """Fetches latest prices from Pyth Hermes endpoint."""

    def __init__(self, settings: Optional[AgentSettings] = None, client: Optional[httpx.Client] = None) -> None:
        self.settings = settings or get_settings()
        self.client = client or httpx.Client(timeout=5.0)

    def fetch_price(self, symbol: str) -> PriceData:
        feed_id = self.settings.pyth.price_feed_ids.get(symbol)
        if not feed_id:
            raise ValueError(f"No Pyth feed configured for symbol: {symbol}")

        url = f"{self.settings.pyth.endpoint}/api/latest_price/{feed_id}"
        headers: Dict[str, str] = {}
        if self.settings.pyth.api_key:
            headers["Authorization"] = f"Bearer {self.settings.pyth.api_key.get_secret_value()}"

        response = self.client.get(url, headers=headers)
        response.raise_for_status()
        data: Dict[str, Any] = response.json()

        price_info = data.get("price") or {}
        price = float(price_info.get("price", 0))
        conf = float(price_info.get("conf", 0))
        publish_time = int(price_info.get("publish_time", 0))

        return PriceData(price=price, confidence=conf, publish_time=publish_time, id=feed_id)



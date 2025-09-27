"""Price fetching tool for integrating Pyth price feeds."""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
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

        feed_param = feed_id[2:] if feed_id.startswith("0x") else feed_id

        base_url = str(self.settings.pyth.endpoint).rstrip("/")
        url = f"{base_url}/api/latest_price_feeds"
        params = {"ids[]": feed_param}
        headers: Dict[str, str] = {}
        if self.settings.pyth.api_key:
            headers["Authorization"] = f"Bearer {self.settings.pyth.api_key.get_secret_value()}"

        response = self.client.get(url, params=params, headers=headers)
        response.raise_for_status()
        data: Any = response.json()

        if not data:
            raise ValueError(f"Empty response from Pyth for feed {feed_id}")

        entry: Dict[str, Any] = data[0]
        price_info = entry.get("price")
        if not price_info:
            raise ValueError(f"No price data in response for feed {feed_id}: {entry}")

        expo = int(price_info.get("expo", 0))
        price_raw = Decimal(price_info.get("price", 0))
        conf_raw = Decimal(price_info.get("conf", 0))
        scale = Decimal(10) ** expo
        price_value = price_raw * scale
        conf_value = conf_raw * scale
        publish_time = int(price_info.get("publish_time", entry.get("publish_time", 0)))

        return PriceData(
            price=float(price_value),
            confidence=float(conf_value),
            publish_time=publish_time,
            id=feed_id,
        )



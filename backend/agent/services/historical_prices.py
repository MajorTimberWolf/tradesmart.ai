"""Historical price fetching from Pyth Hermes with simple pagination and cache.

This module focuses on retrieving raw historical price updates for a single
Pyth price feed ID over a time window. Aggregation into OHLC candles and
backfilling are handled in separate steps.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

import httpx

from backend.agent.config.settings import AgentSettings, get_settings


def _normalize_feed_id(feed_id: str) -> str:
    return feed_id[2:] if feed_id.lower().startswith("0x") else feed_id


def _parse_hermes_endpoint(raw_endpoint: str) -> Tuple[str, Dict[str, str]]:
    headers: Dict[str, str] = {}
    try:
        url = httpx.URL(raw_endpoint)
        if url.user is not None and url.password is not None:
            auth_bytes = f"{url.user}:{url.password}".encode("utf-8")
            # httpx private util for base64 encode; avoids extra deps
            headers["Authorization"] = "Basic " + httpx._models._base64_encode(auth_bytes)
            sanitized = url.copy_with(user=None, password=None)
            return str(sanitized), headers
        return str(url), headers
    except Exception:
        return raw_endpoint, headers


@dataclass
class PriceUpdate:
    publish_time: int
    price: int
    expo: int


class HistoricalPriceFetcher:
    """Fetch raw historical price updates from Hermes with basic pagination.

    Caching: in-memory dictionary keyed by (feed_id, start_time, end_time).
    """

    def __init__(self, settings: Optional[AgentSettings] = None, client: Optional[httpx.Client] = None) -> None:
        self._settings = settings or get_settings()
        endpoint = str(self._settings.pyth.endpoint)
        base_url, headers = _parse_hermes_endpoint(endpoint)
        self._base_url = base_url.rstrip("/")
        self._headers: Dict[str, str] = headers
        if self._settings.pyth.api_key:
            self._headers["Authorization"] = f"Bearer {self._settings.pyth.api_key.get_secret_value()}"
        self._client = client or httpx.Client(timeout=15.0)
        self._cache: Dict[Tuple[str, int, int], List[PriceUpdate]] = {}

    def fetch_updates(self, feed_id: str, start_time: int, end_time: int, page_size: int = 5000) -> List[PriceUpdate]:
        key = (feed_id.lower(), int(start_time), int(end_time))
        if key in self._cache:
            return self._cache[key]

        normalized_id = _normalize_feed_id(feed_id)
        url = f"{self._base_url}/v2/updates/price/{normalized_id}"

        params: Dict[str, Any] = {
            "start_time": start_time,
            "end_time": end_time,
            "limit": page_size,
            "parsed": True,
            "encoding": "json",
        }

        updates: List[PriceUpdate] = []
        next_token: Optional[str] = None

        while True:
            if next_token:
                params["page_token"] = next_token
            response = self._client.get(url, params=params, headers=self._headers)
            response.raise_for_status()
            payload: Dict[str, Any] = response.json()

            # Expected shapes vary; try a couple of common patterns
            items: List[Dict[str, Any]]
            if isinstance(payload, dict) and "data" in payload and isinstance(payload["data"], list):
                items = payload["data"]
                next_token = payload.get("next_page_token") or payload.get("next")
            elif isinstance(payload, list):
                items = payload
                next_token = None
            else:
                # Unknown shape; bail out
                items = []
                next_token = None

            for item in items:
                parsed = item.get("parsed") or item
                price_obj = parsed.get("price") or parsed.get("ema_price") or {}
                try:
                    updates.append(
                        PriceUpdate(
                            publish_time=int(parsed.get("publish_time") or parsed.get("publishTime") or 0),
                            price=int(price_obj.get("price", 0)),
                            expo=int(price_obj.get("expo", 0)),
                        )
                    )
                except Exception:
                    continue

            if not next_token:
                break

        # Sort chronologically and cache
        updates.sort(key=lambda u: u.publish_time)
        self._cache[key] = updates
        return updates


__all__ = ["HistoricalPriceFetcher", "PriceUpdate"]



"""Historical price fetching from Pyth Hermes with simple pagination and cache.

This module focuses on retrieving raw historical price updates for a single
Pyth price feed ID over a time window. Aggregation into OHLC candles and
backfilling are handled in separate steps.
"""

from __future__ import annotations

from dataclasses import dataclass
import base64
from typing import Any, Dict, List, Optional, Tuple

import httpx

from backend.agent.config.settings import AgentSettings, get_settings


def _ensure_prefixed_feed_id(feed_id: str) -> str:
    return feed_id if feed_id.lower().startswith("0x") else f"0x{feed_id}"


def _strip_prefix(feed_id: str) -> str:
    return feed_id[2:] if feed_id.lower().startswith("0x") else feed_id


def _parse_hermes_endpoint(raw_endpoint: str) -> Tuple[str, Dict[str, str]]:
    headers: Dict[str, str] = {}
    try:
        url = httpx.URL(raw_endpoint)
        if url.user is not None and url.password is not None:
            auth_bytes = f"{url.user}:{url.password}".encode("utf-8")
            token = base64.b64encode(auth_bytes).decode("ascii")
            headers["Authorization"] = "Basic " + token
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

        prefixed_id = _ensure_prefixed_feed_id(feed_id)
        stripped_id = _strip_prefix(feed_id)

        updates = self._try_updates_api(prefixed_id, start_time, end_time, page_size)
        if not updates:
            updates = self._try_updates_api(stripped_id, start_time, end_time, page_size)
        if not updates:
            updates = self._fallback_history_api(prefixed_id, stripped_id, start_time, end_time)
        updates.sort(key=lambda u: u.publish_time)
        self._cache[key] = updates
        return updates

    def _try_updates_api(self, feed_identifier: str, start_time: int, end_time: int, page_size: int) -> List[PriceUpdate]:
        url = f"{self._base_url}/v2/updates/price/{feed_identifier}"
        params: Dict[str, Any] = {
            "start_time": start_time,
            "end_time": end_time,
            "limit": page_size,
            "parsed": True,
            "encoding": "json",
        }
        updates: List[PriceUpdate] = []
        next_token: Optional[str] = None
        try:
            while True:
                if next_token:
                    params["page_token"] = next_token
                response = self._client.get(url, params=params, headers=self._headers)
                if response.status_code >= 400:
                    # Give caller a chance to fallback
                    return []
                payload: Any = response.json()
                items: List[Dict[str, Any]]
                if isinstance(payload, dict) and isinstance(payload.get("data"), list):
                    items = payload["data"]
                    next_token = payload.get("next_page_token") or payload.get("next")
                elif isinstance(payload, list):
                    items = payload
                    next_token = None
                else:
                    break
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
        except Exception:
            return []
        return updates

    def _fallback_history_api(
        self, prefixed_id: str, stripped_id: str, start_time: int, end_time: int
    ) -> List[PriceUpdate]:
        # Try 1m then 5m resolutions similar to frontend approach
        # Request a larger window so we can cover ~5 days at 5m resolution
        endpoints = [
            f"{self._base_url}/v2/price_feeds/{prefixed_id}/price/history?resolution=5m&limit=2000",
            f"{self._base_url}/v2/price_feeds/{prefixed_id}/price/history?resolution=1m&limit=2000",
            f"{self._base_url}/v2/price_feeds/{stripped_id}/price/history?resolution=5m&limit=2000",
            f"{self._base_url}/v2/price_feeds/{stripped_id}/price/history?resolution=1m&limit=2000",
        ]
        all_updates: List[PriceUpdate] = []
        for url in endpoints:
            try:
                resp = self._client.get(url, headers=self._headers)
                if resp.status_code >= 400:
                    continue
                data: Any = resp.json()
                history = data.get("price_history") or data.get("data") or []
                items: List[Any] = history if isinstance(history, list) else []
                for entry in items:
                    try:
                        # Support flat or nested price/expo shapes
                        price_val = entry.get("price")
                        expo_val = entry.get("expo")
                        if isinstance(price_val, dict):
                            expo_val = price_val.get("expo")
                            price_val = price_val.get("price")
                        if price_val is None:
                            continue
                        publish_time = (
                            entry.get("publish_time")
                            or entry.get("publishTime")
                            or (int(entry.get("timestamp") / 1000) if entry.get("timestamp") else None)
                        )
                        if publish_time is None:
                            continue
                        pu = PriceUpdate(
                            publish_time=int(publish_time),
                            price=int(price_val),
                            expo=int(expo_val or 0),
                        )
                        if start_time <= pu.publish_time < end_time:
                            all_updates.append(pu)
                    except Exception:
                        continue
                if all_updates:
                    break
            except Exception:
                continue
        return all_updates


__all__ = ["HistoricalPriceFetcher", "PriceUpdate"]



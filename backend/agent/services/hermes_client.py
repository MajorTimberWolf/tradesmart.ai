"""Lightweight Hermes HTTP client with optional basic-auth support.

Centralizes Pyth Hermes interactions so other modules (e.g., historical
fetchers and analytics) can share consistent headers, auth, and error
handling.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

import httpx

from backend.agent.config.settings import AgentSettings, get_settings


class HermesClientError(RuntimeError):
    """Raised when Hermes returns an error or an unexpected payload."""


def _parse_hermes_endpoint(raw_endpoint: str) -> Tuple[str, Dict[str, str]]:
    """Parse endpoint, extracting basic auth if embedded in the URL.

    Accepts endpoints like ``https://user:pass@hermes.pyth.network`` and
    returns a sanitized URL and appropriate Authorization header.
    """

    headers: Dict[str, str] = {}
    try:
        url = httpx.URL(raw_endpoint)
        if url.user is not None and url.password is not None:
            auth_bytes = f"{url.user}:{url.password}".encode("utf-8")
            headers["Authorization"] = "Basic " + httpx._models._base64_encode(auth_bytes)
            # strip credentials from the emitted URL
            sanitized = url.copy_with(user=None, password=None)
            return str(sanitized), headers
        return str(url), headers
    except Exception:
        # Best effort: fall back to raw string if parsing fails
        return raw_endpoint, headers


@dataclass
class LatestPriceFeed:
    id: str
    price: float
    confidence: float
    publish_time: int


class HermesClient:
    """Minimal Hermes client for latest price feeds and shared plumbing.

    Notes
    -----
    - Adds Basic and Bearer Authorization headers when available
    - Normalizes feed IDs with or without ``0x`` prefix
    """

    def __init__(self, settings: Optional[AgentSettings] = None, client: Optional[httpx.Client] = None) -> None:
        self._settings = settings or get_settings()
        endpoint = str(self._settings.pyth.endpoint)
        base_url, headers = _parse_hermes_endpoint(endpoint)

        self._base_url = base_url.rstrip("/")
        self._headers: Dict[str, str] = headers
        if self._settings.pyth.api_key:
            self._headers["Authorization"] = f"Bearer {self._settings.pyth.api_key.get_secret_value()}"

        # Short client timeout; higher-level callers can inject their own
        self._client = client or httpx.Client(timeout=10.0)

    @staticmethod
    def _normalize_feed_id(feed_id: str) -> str:
        return feed_id[2:] if feed_id.lower().startswith("0x") else feed_id

    def get_latest_price_feeds(self, feed_ids: List[str]) -> List[Dict[str, Any]]:
        """Fetch latest price feed entries for the provided Pyth feed IDs.

        Returns the Hermes JSON (list of entries). Callers can transform to
        domain models as needed.
        """

        if not feed_ids:
            return []

        url = f"{self._base_url}/api/latest_price_feeds"
        params = [("ids[]", self._normalize_feed_id(fid)) for fid in feed_ids]
        response = self._client.get(url, params=params, headers=self._headers)
        try:
            response.raise_for_status()
        except httpx.HTTPError as exc:
            raise HermesClientError(f"Hermes request failed: {exc}") from exc

        try:
            payload = response.json()
        except ValueError as exc:
            raise HermesClientError("Hermes returned non-JSON response") from exc

        if not isinstance(payload, list):
            raise HermesClientError("Unexpected Hermes response shape (expected list)")

        return payload


__all__ = [
    "HermesClient",
    "HermesClientError",
    "LatestPriceFeed",
]



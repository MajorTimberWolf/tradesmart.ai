"""Client utilities for interacting with the OpenRouter API."""

from __future__ import annotations

import json
from typing import Any, Dict

import httpx

from backend.agent.config.settings import AgentSettings, get_settings


class OpenRouterError(RuntimeError):
    """Raised when the OpenRouter API returns an error."""

class OpenRouterClient:
    """Async client for OpenRouter LLM interactions."""

    def __init__(self, settings: AgentSettings | None = None) -> None:
        self._settings = settings or get_settings()
        self._base_url = str(self._settings.llm.base_url)
        self._timeout = httpx.Timeout(self._settings.llm.request_timeout_seconds)
        if self._settings.llm.api_key is None:
            raise OpenRouterError("OpenRouter API key is not configured")
        self._api_key = self._settings.llm.api_key.get_secret_value()

    async def generate_json(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Send a chat completion request expecting JSON output."""

        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            # OpenRouter recommends providing an identifier for rate-limiting context
            "X-Title": "ERC8004-Agent-Chart-Analysis",
        }

        url = f"{self._base_url.rstrip('/')}/chat/completions"

        async with httpx.AsyncClient(timeout=self._timeout) as client:
            response = await client.post(url, json=payload, headers=headers)

        if response.status_code >= 400:
            raise OpenRouterError(f"OpenRouter API error {response.status_code}: {response.text}")

        try:
            data = response.json()
        except ValueError as exc:  # pragma: no cover - defensive
            raise OpenRouterError("Invalid JSON returned from OpenRouter") from exc

        try:
            message = data["choices"][0]["message"]["content"]
        except (KeyError, IndexError) as exc:
            raise OpenRouterError("Unexpected OpenRouter response format") from exc

        if not message:
            raise OpenRouterError("OpenRouter response contained no message content")

        content = message[0] if isinstance(message, list) else message

        if isinstance(content, dict) and "text" in content:
            raw_text = content["text"]
        else:
            raw_text = content

        if isinstance(raw_text, list):  # anthropic can sometimes nest content
            raw_text = "".join(segment.get("text", "") for segment in raw_text if isinstance(segment, dict))

        try:
            parsed = json.loads(raw_text)
        except json.JSONDecodeError as exc:
            raise OpenRouterError(f"Failed to parse OpenRouter JSON response: {raw_text}") from exc

        if not isinstance(parsed, dict):
            raise OpenRouterError("OpenRouter JSON response was not an object")

        return parsed


async def generate_json(payload: Dict[str, Any], settings: AgentSettings | None = None) -> Dict[str, Any]:
    """Module-level helper that mirrors :meth:`OpenRouterClient.generate_json`."""

    client = OpenRouterClient(settings=settings)
    return await client.generate_json(payload)


__all__ = ["OpenRouterClient", "OpenRouterError", "generate_json"]

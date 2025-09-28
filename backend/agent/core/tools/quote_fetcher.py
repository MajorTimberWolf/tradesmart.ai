"""DEX quote and swap building via the 1inch Aggregation API."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

import httpx

from backend.agent.config.settings import AgentSettings, get_settings


@dataclass
class QuoteResult:
    from_token_amount: int
    to_token_amount: int
    estimated_gas: Optional[int]
    protocols: list


@dataclass
class SwapTransaction:
    to: str
    data: str
    value: int
    gas: Optional[int]


class QuoteFetcher:
    """Thin wrapper around 1inch endpoints used by the execution pipeline."""

    def __init__(self, settings: Optional[AgentSettings] = None, client: Optional[httpx.Client] = None) -> None:
        self.settings = settings or get_settings()
        self.client = client or httpx.Client(timeout=15.0)

    @property
    def _base_url(self) -> str:
        chain_id = self.settings.oneinch.chain
        return f"{self.settings.oneinch.api_base}/{chain_id}" if hasattr(self.settings.oneinch, "api_base") else f"https://api.1inch.io/v5.0/{chain_id}"

    def _headers(self) -> dict[str, str]:
        headers: dict[str, str] = {"Accept": "application/json"}
        if self.settings.oneinch.api_key:
            headers["Authorization"] = f"Bearer {self.settings.oneinch.api_key.get_secret_value()}"
        return headers

    def fetch_swap_quote(self, from_token: str, to_token: str, amount: int) -> QuoteResult:
        params = {
            "fromTokenAddress": from_token,
            "toTokenAddress": to_token,
            "amount": str(amount),
        }
        url = f"{self._base_url}/quote"
        response = self.client.get(url, params=params, headers=self._headers())
        try:
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            raise RuntimeError(f"1inch quote failed: {exc}") from exc

        payload = response.json()
        return QuoteResult(
            from_token_amount=int(payload["fromTokenAmount"]),
            to_token_amount=int(payload["toTokenAmount"]),
            estimated_gas=int(payload.get("estimatedGas", 0)) if payload.get("estimatedGas") else None,
            protocols=payload.get("protocols", []),
        )

    def build_swap_transaction(
        self,
        from_token: str,
        to_token: str,
        amount: int,
        from_address: str,
        slippage: float,
    ) -> SwapTransaction:
        params = {
            "fromTokenAddress": from_token,
            "toTokenAddress": to_token,
            "amount": str(amount),
            "fromAddress": from_address,
            "slippage": str(slippage),
        }
        url = f"{self._base_url}/swap"
        response = self.client.get(url, params=params, headers=self._headers())
        try:
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            raise RuntimeError(f"1inch swap build failed: {exc}") from exc

        payload = response.json().get("tx", {})
        return SwapTransaction(
            to=payload.get("to", ""),
            data=payload.get("data", "0x"),
            value=int(payload.get("value", "0"), 0) if isinstance(payload.get("value"), str) else int(payload.get("value", 0)),
            gas=int(payload.get("gas")) if payload.get("gas") else None,
        )

    def list_tokens(self) -> dict[str, dict[str, str]]:
        url = f"{self._base_url}/tokens"
        response = self.client.get(url, headers=self._headers())
        try:
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            raise RuntimeError(f"1inch token list failed: {exc}") from exc
        payload = response.json()
        return payload.get("tokens", {})


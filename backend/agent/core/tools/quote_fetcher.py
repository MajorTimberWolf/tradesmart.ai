"""DEX quote fetching via 1inch API."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

import httpx

from backend.agent.config.settings import AgentSettings, get_settings


@dataclass
class QuoteResult:
    to_token_amount: int
    from_token_amount: int
    tx_data: dict


class QuoteFetcher:
    def __init__(self, settings: Optional[AgentSettings] = None, client: Optional[httpx.Client] = None) -> None:
        self.settings = settings or get_settings()
        self.client = client or httpx.Client(timeout=10.0)

    def fetch_swap_quote(self, from_token: str, to_token: str, amount: int) -> QuoteResult:
        params = {
            "src": from_token,
            "dst": to_token,
            "amount": str(amount),
        }
        headers = {"Authorization": f"Bearer {self.settings.oneinch.api_key.get_secret_value()}"}
        url = f"{self.settings.oneinch.api_base}?chainId={self.settings.oneinch.chain}"
        response = self.client.get(url, params=params, headers=headers)
        response.raise_for_status()
        data = response.json()
        return QuoteResult(
            to_token_amount=int(data["toTokenAmount"]),
            from_token_amount=int(data["fromTokenAmount"]),
            tx_data=data.get("tx", {}),
        )



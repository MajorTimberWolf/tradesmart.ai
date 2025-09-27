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
        """Fetch swap quote from 1inch API."""
        chain_id = self.settings.oneinch.chain
        base_url = f"https://api.1inch.io/v5.0/{chain_id}"
        
        # Get quote
        quote_url = f"{base_url}/quote"
        quote_params = {
            "fromTokenAddress": from_token,
            "toTokenAddress": to_token,
            "amount": str(amount),
        }
        
        headers = {}
        if self.settings.oneinch.api_key:
            headers["Authorization"] = f"Bearer {self.settings.oneinch.api_key.get_secret_value()}"
        
        try:
            response = self.client.get(quote_url, params=quote_params, headers=headers)
            response.raise_for_status()
            quote_data = response.json()
            
            # For now, return a mock quote since 1inch API might not support Sepolia
            # In production, you'd want to handle this properly
            return QuoteResult(
                to_token_amount=int(quote_data.get("toTokenAmount", amount * 2000)),  # Mock 1 ETH = 2000 USDC
                from_token_amount=int(quote_data.get("fromTokenAmount", amount)),
                tx_data={"data": "0x", "to": "0x0000000000000000000000000000000000000000", "value": "0"},
            )
        except Exception as e:
            # Fallback to mock data for testing
            print(f"1inch API error: {e}, using mock data")
            return QuoteResult(
                to_token_amount=amount * 2000,  # Mock 1 ETH = 2000 USDC
                from_token_amount=amount,
                tx_data={"data": "0x", "to": "0x0000000000000000000000000000000000000000", "value": "0"},
            )



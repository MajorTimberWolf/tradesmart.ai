"""Generate swap plans using 1inch quotes for execution strategies."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional, Dict, Any

from backend.agent.core.tools.price_fetcher import PriceFetcher
from backend.agent.core.tools.quote_fetcher import QuoteFetcher, QuoteResult, SwapTransaction
from backend.agent.execution.strategy_monitor import ExecutionPlan
from backend.agent.services.strategy_schema import StrategyConfig


@dataclass
class SwapPlan:
    strategy: StrategyConfig
    amount_in: int
    quote: QuoteResult
    min_amount_out: int
    swap_tx: SwapTransaction

    def to_dict(self) -> Dict[str, Any]:
        return {
            "strategy": {
                "symbol": self.strategy.symbol,
                "timeframe": self.strategy.timeframe,
                "tradingPair": {
                    "id": self.strategy.trading_pair.id,
                    "label": self.strategy.trading_pair.label,
                    "tokenIn": self.strategy.trading_pair.base_token,
                    "tokenOut": self.strategy.trading_pair.quote_token,
                    "decimals": self.strategy.trading_pair.decimals.model_dump(),
                },
                "execution": self.strategy.execution.model_dump(mode="json"),
            },
            "amountIn": self.amount_in,
            "minAmountOut": self.min_amount_out,
            "quote": {
                "fromTokenAmount": self.quote.from_token_amount,
                "toTokenAmount": self.quote.to_token_amount,
                "estimatedGas": self.quote.estimated_gas,
                "protocols": self.quote.protocols,
            },
            "swapTx": {
                "to": self.swap_tx.to,
                "data": self.swap_tx.data,
                "value": self.swap_tx.value,
                "gas": self.swap_tx.gas,
            },
        }


class SwapPlanner:
    """Converts execution plans into concrete swap instructions."""

    def __init__(
        self,
        quote_fetcher: Optional[QuoteFetcher] = None,
        price_fetcher: Optional[PriceFetcher] = None,
        from_address: Optional[str] = None,
    ) -> None:
        self._quotes = quote_fetcher or QuoteFetcher()
        self._prices = price_fetcher or PriceFetcher()
        self._from_address = from_address

    def plan(self, execution_plan: ExecutionPlan, portfolio_usd: Optional[float] = None) -> SwapPlan:
        strategy = execution_plan.strategy
        amount_in = self._determine_amount_in(strategy, portfolio_usd)
        quote = self._quotes.fetch_swap_quote(
            strategy.trading_pair.base_token,
            strategy.trading_pair.quote_token,
            amount_in,
        )
        min_amount_out = int(quote.to_token_amount * (1 - strategy.execution.slippage_tolerance / 100))
        swap_tx = self._quotes.build_swap_transaction(
            from_token=strategy.trading_pair.base_token,
            to_token=strategy.trading_pair.quote_token,
            amount=amount_in,
            from_address=self._resolve_from_address(),
            slippage=strategy.execution.slippage_tolerance,
        )
        return SwapPlan(
            strategy=strategy,
            amount_in=amount_in,
            quote=quote,
            min_amount_out=min_amount_out,
            swap_tx=swap_tx,
        )

    def _determine_amount_in(self, strategy: StrategyConfig, portfolio_usd: Optional[float]) -> int:
        position = strategy.execution.position_size
        decimals = strategy.trading_pair.decimals.base
        price = self._prices.fetch_price(strategy.symbol).price
        if price <= 0:
            raise ValueError("Price feed returned non-positive value")

        if position.type == "fixed_usd":
            base_units = (position.value / price) * (10 ** decimals)
            return int(base_units)

        if portfolio_usd is None:
            raise ValueError("portfolio_usd required for percentage position size")
        allocation = portfolio_usd * (position.value / 100)
        base_units = (allocation / price) * (10 ** decimals)
        return int(base_units)

    def _resolve_from_address(self) -> str:
        if not self._from_address:
            from backend.agent.config.settings import get_settings

            settings = get_settings()
            if not settings.wallet.address:
                raise ValueError("Wallet address missing; update backend/agent/.env")
            self._from_address = settings.wallet.address
        return self._from_address


__all__ = ["SwapPlanner", "SwapPlan"]

"""Main trading agent orchestration logic."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from backend.agent.config.settings import AgentSettings, get_settings
from backend.agent.core.strategies.strategy_base import Strategy
from backend.agent.core.tools.contract_executor import ContractExecutor
from backend.agent.core.tools.price_fetcher import PriceFetcher
from backend.agent.core.tools.quote_fetcher import QuoteFetcher
from backend.agent.core.tools.risk_manager import RiskManager


class TradingAgent:
    def __init__(
        self,
        strategy: Strategy,
        settings: Optional[AgentSettings] = None,
        price_fetcher: Optional[PriceFetcher] = None,
        quote_fetcher: Optional[QuoteFetcher] = None,
        executor: Optional[ContractExecutor] = None,
        risk_manager: Optional[RiskManager] = None,
    ) -> None:
        self.settings = settings or get_settings()
        self.strategy = strategy
        self.price_fetcher = price_fetcher or PriceFetcher(self.settings)
        self.quote_fetcher = quote_fetcher or QuoteFetcher(self.settings)
        self.executor = executor or ContractExecutor(self.settings)
        self.risk_manager = risk_manager or RiskManager(self.settings)

    def run_cycle(self) -> None:
        now = datetime.utcnow()
        market_state = self.strategy.collect_market_data(self.price_fetcher)
        signal = self.strategy.generate_signal(market_state)

        if not signal.should_enter:
            return

        quote = self.quote_fetcher.fetch_swap_quote(signal.from_token, signal.to_token, signal.amount)

        position_assessment = self.risk_manager.validate_position_size(signal.portfolio_value, signal.position_size)
        if not position_assessment.is_acceptable:
            return

        slippage_assessment = self.risk_manager.validate_slippage(signal.expected_price, quote.to_token_amount / signal.amount)
        if not slippage_assessment.is_acceptable:
            return

        params = self.strategy.build_execution_params(signal, quote)
        self.executor.execute_strategy(self.strategy.strategy_id, params)



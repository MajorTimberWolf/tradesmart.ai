"""Tests for the trading agent orchestration logic."""

from __future__ import annotations

from backend.agent.core.agent import TradingAgent
from backend.agent.core.strategies.strategy_base import Strategy, TradeSignal
from backend.agent.core.tools.contract_executor import ExecutionResult
from backend.agent.core.tools.price_fetcher import PriceData
from backend.agent.core.tools.quote_fetcher import QuoteResult
from backend.agent.core.tools.risk_manager import RiskAssessment


class DummyPriceFetcher:
    def fetch_price(self, symbol: str) -> PriceData:
        return PriceData(price=100.0, confidence=0.5, publish_time=1234567890, id=symbol)


class DummyQuoteFetcher:
    def fetch_swap_quote(self, from_token: str, to_token: str, amount: int) -> QuoteResult:
        return QuoteResult(
            to_token_amount=amount,
            from_token_amount=amount,
            tx_data={"data": "0xdeadbeef"},
        )


class DummyRiskManager:
    def __init__(self, allow: bool = True) -> None:
        self.allow = allow

    def validate_position_size(self, portfolio_value: float, position_value: float) -> RiskAssessment:
        return RiskAssessment(self.allow)

    def validate_slippage(self, expected_price: float, execution_price: float) -> RiskAssessment:
        return RiskAssessment(self.allow)


class DummyExecutor:
    def __init__(self) -> None:
        self.called = False
        self.last_args = None

    def execute_strategy(self, strategy_id: bytes, params: dict) -> ExecutionResult:
        self.called = True
        self.last_args = (strategy_id, params)
        return ExecutionResult(success=True, data=b"", tx_hash="0x1234")


class DummyStrategy(Strategy):
    strategy_id = b"TEST"

    def __init__(self, should_enter: bool) -> None:
        self._should_enter = should_enter

    def collect_market_data(self, price_fetcher: DummyPriceFetcher) -> PriceData:
        return price_fetcher.fetch_price("ETH_USD")

    def generate_signal(self, market_state: PriceData) -> TradeSignal:
        return TradeSignal(
            should_enter=self._should_enter,
            from_token="0xfrom",
            to_token="0xto",
            amount=1_000,
            expected_price=market_state.price,
            portfolio_value=10_000,
            position_size=2_000,
        )

    def build_execution_params(self, signal: TradeSignal, quote: QuoteResult) -> dict:
        return {"amount": signal.amount, "tx": quote.tx_data}


def test_agent_executes_when_signal_and_risk_pass() -> None:
    strategy = DummyStrategy(should_enter=True)
    executor = DummyExecutor()
    agent = TradingAgent(
        strategy=strategy,
        price_fetcher=DummyPriceFetcher(),
        quote_fetcher=DummyQuoteFetcher(),
        executor=executor,
        risk_manager=DummyRiskManager(allow=True),
    )

    agent.run_cycle()

    assert executor.called is True
    assert executor.last_args[0] == strategy.strategy_id


def test_agent_skips_when_risk_fails() -> None:
    strategy = DummyStrategy(should_enter=True)
    executor = DummyExecutor()
    agent = TradingAgent(
        strategy=strategy,
        price_fetcher=DummyPriceFetcher(),
        quote_fetcher=DummyQuoteFetcher(),
        executor=executor,
        risk_manager=DummyRiskManager(allow=False),
    )

    agent.run_cycle()

    assert executor.called is False



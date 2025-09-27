"""CLI entry point for running a single agent cycle."""

from __future__ import annotations

import argparse

from backend.agent.config.settings import get_settings
from backend.agent.core.agent import TradingAgent
from backend.agent.core.strategies.rsi_strategy import RSIStrategy


def run_once() -> None:
    settings = get_settings()
    strategy = RSIStrategy(settings)
    agent = TradingAgent(strategy=strategy, settings=settings)
    agent.run_cycle()


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the LangChain trading agent")
    parser.add_argument("--mode", choices=["once"], default="once")
    args = parser.parse_args()

    if args.mode == "once":
        run_once()


if __name__ == "__main__":
    main()


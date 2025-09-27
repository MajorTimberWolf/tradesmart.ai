"""Static configuration values for the LangChain trading agent."""

from __future__ import annotations

from datetime import timedelta
from decimal import Decimal


# Supported blockchain networks
MAINNET_CHAIN_ID = 1
SEPOLIA_CHAIN_ID = 11155111


# Default network the agent will target during development
DEFAULT_CHAIN_ID = SEPOLIA_CHAIN_ID


# Contract names used to look up addresses in `contracts/addresses.json`
CONTRACT_IDENTITY_REGISTRY = "identity_registry"
CONTRACT_REPUTATION = "reputation"
CONTRACT_VALIDATION = "validation"
CONTRACT_STRATEGY_REGISTRY = "strategy_registry"
CONTRACT_BASE_AGENT = "base_agent"


# Strategy identifiers
STRATEGY_RSI = "rsi"
STRATEGY_GRID = "grid"
STRATEGY_DCA = "dca"


# RSI strategy defaults
RSI_LOOKBACK_PERIOD = 14
RSI_OVERSOLD = 30
RSI_OVERBOUGHT = 70
RSI_ENTRY_COOLDOWN = timedelta(minutes=5)


# Risk management defaults
MAX_PORTFOLIO_EXPOSURE = Decimal("0.25")  # 25% of capital per position
STOP_LOSS_BPS = 150  # 1.50%
TAKE_PROFIT_BPS = 300  # 3.00%
MAX_SLIPPAGE_BPS = 75  # 0.75%


# External service identifiers
SERVICE_PYTH = "pyth"
SERVICE_ONE_INCH = "oneinch"
SERVICE_X402 = "x402"


# Default polling intervals
PRICE_POLL_INTERVAL = timedelta(seconds=45)
HEARTBEAT_INTERVAL = timedelta(minutes=1)


# Persistence defaults
DEFAULT_SQLITE_PATH = "./backend/agent/data/agent_state.db"


# Logging
LOGGING_CONFIG_PATH = "./backend/agent/execution/logging.yaml"


# x402 configuration defaults
X402_DEFAULT_ASSET = "USDC"
X402_DEFAULT_AMOUNT = Decimal("0.10")  # $0.10 per API call budget


# Pyth configuration defaults
PYTH_HERMES_ENDPOINT = "https://hermes.pyth.network"
PYTH_PRICE_FEED_IDS: dict[str, str] = {
    "ETH_USD": "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
    "BTC_USD": "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
}


# 1inch configuration defaults
ONE_INCH_API_BASE = "https://api.1inch.io"
ONE_INCH_SWAP_ENDPOINT = "/v5.0"


# Agent metadata
AGENT_VERSION = "0.1.0"
MAX_RETRY_ATTEMPTS = 3
RETRY_BACKOFF_SECONDS = 5


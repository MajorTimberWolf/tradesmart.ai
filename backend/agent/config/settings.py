"""Runtime configuration loading for the LangChain trading agent."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Literal, Optional

from pydantic import Field, HttpUrl, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

from . import constants


class ContractsConfig(BaseSettings):
    """Addresses and ABIs for the deployed ERC8004 ecosystem."""

    identity_registry: Optional[str] = None
    reputation: Optional[str] = None
    validation: Optional[str] = None
    strategy_registry: Optional[str] = None
    base_agent: Optional[str] = None


class WalletConfig(BaseSettings):
    """Settings for the agent's blockchain identity and signing."""

    private_key: SecretStr
    address: Optional[str] = None
    passphrase: Optional[SecretStr] = None


class NetworkConfig(BaseSettings):
    """Network endpoints for interacting with blockchains and services."""

    chain_id: int = Field(default=constants.DEFAULT_CHAIN_ID)
    rpc_url: HttpUrl
    websocket_url: Optional[HttpUrl] = None
    explorer_base_url: Optional[HttpUrl] = None


class PythConfig(BaseSettings):
    """Configuration for interacting with Pyth oracle services."""

    endpoint: HttpUrl = Field(default=constants.PYTH_HERMES_ENDPOINT)
    api_key: Optional[SecretStr] = None
    price_feed_ids: dict[str, str] = Field(default_factory=lambda: constants.PYTH_PRICE_FEED_IDS)


class OneInchConfig(BaseSettings):
    """Configuration for the 1inch API."""

    api_base: HttpUrl = Field(default=f"{constants.ONE_INCH_API_BASE}{constants.ONE_INCH_SWAP_ENDPOINT}")
    api_key: SecretStr
    chain: int = Field(default=constants.DEFAULT_CHAIN_ID)


class X402Config(BaseSettings):
    """Configuration for x402 autonomous payments."""

    service_url: HttpUrl
    api_key: SecretStr
    asset_symbol: str = Field(default=constants.X402_DEFAULT_ASSET)
    payment_amount: str = Field(default=str(constants.X402_DEFAULT_AMOUNT))


class PersistenceConfig(BaseSettings):
    """State persistence and analytics storage configuration."""

    sqlite_path: Path = Field(default=Path(constants.DEFAULT_SQLITE_PATH))
    redis_url: Optional[str] = None


class LoggingConfig(BaseSettings):
    """Structured logging configuration for the agent."""

    config_path: Path = Field(default=Path(constants.LOGGING_CONFIG_PATH))
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"


class StrategyConfig(BaseSettings):
    """Parameters shared across strategies."""

    default_strategy: str = constants.STRATEGY_RSI
    max_portfolio_exposure: str = Field(default=str(constants.MAX_PORTFOLIO_EXPOSURE))
    stop_loss_bps: int = Field(default=constants.STOP_LOSS_BPS)
    take_profit_bps: int = Field(default=constants.TAKE_PROFIT_BPS)
    max_slippage_bps: int = Field(default=constants.MAX_SLIPPAGE_BPS)
    rsi_lookback_period: int = Field(default=constants.RSI_LOOKBACK_PERIOD)
    rsi_overbought: int = Field(default=constants.RSI_OVERBOUGHT)
    rsi_oversold: int = Field(default=constants.RSI_OVERSOLD)


ENV_FILE_PATH = Path(__file__).resolve().parent.parent / ".env"


# Ensure future `get_settings()` calls respect the nested agent folder layout.
ENV_FILE_PATH = Path(__file__).resolve().parent.parent / ".env"


class AgentSettings(BaseSettings):
    """Root settings object composed of the agent's sub-configs."""

    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE_PATH),
        env_file_encoding="utf-8",
        case_sensitive=False,
        env_nested_delimiter="__",
    )

    environment: Literal["development", "staging", "production"] = Field(default="development")
    agent_version: str = Field(default=constants.AGENT_VERSION)

    wallet: WalletConfig
    network: NetworkConfig
    contracts: ContractsConfig = Field(default_factory=ContractsConfig)
    pyth: PythConfig = Field(default_factory=PythConfig)
    oneinch: OneInchConfig
    x402: X402Config
    persistence: PersistenceConfig = Field(default_factory=PersistenceConfig)
    logging: LoggingConfig = Field(default_factory=LoggingConfig)
    strategy: StrategyConfig = Field(default_factory=StrategyConfig)

    heartbeat_interval_seconds: int = Field(default=int(constants.HEARTBEAT_INTERVAL.total_seconds()))
    price_poll_interval_seconds: int = Field(default=int(constants.PRICE_POLL_INTERVAL.total_seconds()))
    retry_attempts: int = Field(default=constants.MAX_RETRY_ATTEMPTS)
    retry_backoff_seconds: int = Field(default=constants.RETRY_BACKOFF_SECONDS)


@lru_cache
def get_settings() -> AgentSettings:
    """Load and cache the agent settings from environment variables."""

    return AgentSettings()


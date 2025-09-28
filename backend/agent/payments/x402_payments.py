"""Helpers for interacting with the on-chain X402 escrow + registry."""

from __future__ import annotations

from dataclasses import dataclass
from importlib import import_module
from pathlib import Path
from typing import Any, Dict, Optional

from eth_typing import ChecksumAddress
from eth_utils import to_checksum_address
from web3 import Web3
from web3.contract import Contract

from backend.agent.config.settings import AgentSettings, get_settings

_MINIMAL_ERC20_ABI = [
    {
        "constant": False,
        "inputs": [
            {"name": "spender", "type": "address"},
            {"name": "value", "type": "uint256"},
        ],
        "name": "approve",
        "outputs": [{"name": "", "type": "bool"}],
        "type": "function",
    }
]


@dataclass
class OrderRequest:
    agent: str
    token_in: str
    token_out: str
    amount_in: int
    min_amount_out: int
    strategy_id: bytes


class X402Payments:
    """High-level helper for the X402 escrow contract."""

    def __init__(
        self,
        settings: Optional[AgentSettings] = None,
        web3: Optional[Web3] = None,
        escrow_address: Optional[str] = None,
        registry_address: Optional[str] = None,
    ) -> None:
        self.settings = settings or get_settings()
        self.web3 = web3 or self._create_web3()
        self.escrow_address = to_checksum_address(
            escrow_address or self._require_address(self.settings.contracts.x402_escrow, "x402_escrow")
        )
        registry_addr = registry_address or self.settings.contracts.x402_strategy_registry
        self.registry_address = to_checksum_address(registry_addr) if registry_addr else None
        self.escrow = self._load_contract("X402Escrow", self.escrow_address)
        self.registry: Optional[Contract] = None
        if self.registry_address:
            self.registry = self._load_contract("X402StrategyRegistry", self.registry_address)

    def _create_web3(self) -> Web3:
        w3 = Web3(Web3.HTTPProvider(self.settings.network.rpc_url))
        if self.settings.network.chain_id == 11155111:
            middleware = self._resolve_poa_middleware()
            w3.middleware_onion.inject(middleware, layer=0)
        return w3

    @staticmethod
    def _resolve_poa_middleware():
        module = import_module("web3.middleware")
        return getattr(module, "geth_poa_middleware")

    def _load_artifact(self, name: str) -> Dict[str, Any]:
        candidates = [
            Path("out") / f"{name}.sol" / f"{name}.json",
            Path("contracts/abi") / f"{name}.json",
        ]
        for path in candidates:
            if path.exists():
                return load_json(path)
        raise FileNotFoundError(f"Artifact for {name} not found. Run forge build.")

    def _load_contract(self, name: str, address: ChecksumAddress) -> Contract:
        artifact = self._load_artifact(name)
        return self.web3.eth.contract(address=address, abi=artifact["abi"])

    def _require_address(self, value: Optional[str], field: str) -> str:
        if not value:
            raise ValueError(f"Missing address for {field}. Update contracts config.")
        return value

    def _send_transaction(self, tx) -> str:
        account = self.web3.eth.account.from_key(self.settings.wallet.private_key.get_secret_value())
        nonce = self.web3.eth.get_transaction_count(account.address)
        built = tx.build_transaction(
            {
                "chainId": self.settings.network.chain_id,
                "gasPrice": self.web3.eth.gas_price,
                "nonce": nonce,
            }
        )
        if "gas" not in built:
            built["gas"] = self.web3.eth.estimate_gas(built)
        signed = account.sign_transaction(built)
        tx_hash = self.web3.eth.send_raw_transaction(signed.rawTransaction)
        receipt = self.web3.eth.wait_for_transaction_receipt(tx_hash)
        if receipt.status != 1:
            raise RuntimeError("Transaction reverted")
        return tx_hash.hex()

    def approve_token(self, token: str, spender: str, amount: int) -> str:
        erc20 = self.web3.eth.contract(address=to_checksum_address(token), abi=_MINIMAL_ERC20_ABI)
        return self._send_transaction(erc20.functions.approve(spender, amount))

    def deposit(self, token: str, amount: int) -> str:
        return self._send_transaction(self.escrow.functions.deposit(token, amount))

    def withdraw(self, token: str, amount: int) -> str:
        return self._send_transaction(self.escrow.functions.withdraw(token, amount))

    def create_order(self, request: OrderRequest) -> str:
        return self._send_transaction(
            self.escrow.functions.createOrder(
                request.agent,
                request.token_in,
                request.token_out,
                request.amount_in,
                request.min_amount_out,
                request.strategy_id,
            )
        )

    def cancel_order(self, order_id: int) -> str:
        return self._send_transaction(self.escrow.functions.cancelOrder(order_id))

    def execute_order(self, order_id: int, recipient: str, amount_out: int) -> str:
        return self._send_transaction(self.escrow.functions.executeOrder(order_id, recipient, amount_out))

    def register_strategy(self, strategy_id: bytes, cid: str, pair_id: str) -> str:
        if not self.registry:
            raise RuntimeError("Strategy registry address not configured")
        return self._send_transaction(self.registry.functions.registerStrategy(strategy_id, cid, pair_id))


def load_json(path: Path) -> Dict[str, Any]:
    import json

    with path.open() as fh:
        return json.load(fh)


__all__ = ["OrderRequest", "X402Payments"]

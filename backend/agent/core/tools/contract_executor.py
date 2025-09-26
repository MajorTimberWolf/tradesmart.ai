"""Tool for interacting with deployed ERC8004 agent contracts."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Optional

from web3 import Web3
from web3.middleware import geth_poa_middleware

from backend.agent.config.settings import AgentSettings, get_settings


@dataclass
class ExecutionResult:
    success: bool
    data: bytes
    tx_hash: str


class ContractExecutor:
    def __init__(self, settings: Optional[AgentSettings] = None, web3: Optional[Web3] = None) -> None:
        self.settings = settings or get_settings()
        self.web3 = web3 or self._create_web3()
        self.agent_contract = self._load_contract(self.settings.contracts.base_agent, "ArbitrageAgent.json")

    def _create_web3(self) -> Web3:
        w3 = Web3(Web3.HTTPProvider(self.settings.network.rpc_url))
        if self.settings.network.chain_id == 11155111:
            w3.middleware_onion.inject(geth_poa_middleware, layer=0)
        return w3

    def _load_contract(self, address: str, abi_filename: str):
        import json
        from pathlib import Path

        abi_path = Path("contracts/abi") / abi_filename
        with open(abi_path) as f:
            contract_json: Dict[str, Any] = json.load(f)
        return self.web3.eth.contract(address=Web3.to_checksum_address(address), abi=contract_json["abi"])

    def execute_strategy(self, strategy_id: bytes, params: Dict[str, Any]) -> ExecutionResult:
        account = self.web3.eth.account.from_key(self.settings.wallet.private_key.get_secret_value())
        nonce = self.web3.eth.get_transaction_count(account.address)

        txn = self.agent_contract.functions.executeStrategy(strategy_id, params).build_transaction(
            {
                "chainId": self.settings.network.chain_id,
                "gas": 1_000_000,
                "gasPrice": self.web3.eth.gas_price,
                "nonce": nonce,
            }
        )

        signed = account.sign_transaction(txn)
        tx_hash = self.web3.eth.send_raw_transaction(signed.rawTransaction)
        receipt = self.web3.eth.wait_for_transaction_receipt(tx_hash)

        return ExecutionResult(success=receipt.status == 1, data=receipt.logs, tx_hash=tx_hash.hex())



"""Command-line utility for interacting with the X402 escrow contract."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from backend.agent.config.settings import get_settings
from backend.agent.payments.x402_payments import OrderRequest, X402Payments


def _parse_amount(value: str) -> int:
    if value.startswith("0x"):
        return int(value, 16)
    return int(value)


def deposit(args: argparse.Namespace) -> None:
    payments = X402Payments()
    tx_hash = payments.deposit(args.token, _parse_amount(args.amount))
    print(json.dumps({"action": "deposit", "txHash": tx_hash}, indent=2))


def withdraw(args: argparse.Namespace) -> None:
    payments = X402Payments()
    tx_hash = payments.withdraw(args.token, _parse_amount(args.amount))
    print(json.dumps({"action": "withdraw", "txHash": tx_hash}, indent=2))


def approve(args: argparse.Namespace) -> None:
    payments = X402Payments()
    tx_hash = payments.approve_token(args.token, payments.escrow_address, _parse_amount(args.amount))
    print(json.dumps({"action": "approve", "txHash": tx_hash}, indent=2))


def create_order(args: argparse.Namespace) -> None:
    payments = X402Payments()
    request = OrderRequest(
        agent=args.agent,
        token_in=args.token_in,
        token_out=args.token_out,
        amount_in=_parse_amount(args.amount_in),
        min_amount_out=_parse_amount(args.min_amount_out),
        strategy_id=bytes.fromhex(args.strategy_id.replace("0x", "")),
    )
    tx_hash = payments.create_order(request)
    print(json.dumps({"action": "create_order", "txHash": tx_hash}, indent=2))


def execute_order(args: argparse.Namespace) -> None:
    payments = X402Payments()
    tx_hash = payments.execute_order(args.order_id, args.recipient, _parse_amount(args.amount_out))
    print(json.dumps({"action": "execute_order", "txHash": tx_hash}, indent=2))


def cancel_order(args: argparse.Namespace) -> None:
    payments = X402Payments()
    tx_hash = payments.cancel_order(args.order_id)
    print(json.dumps({"action": "cancel_order", "txHash": tx_hash}, indent=2))


def register_strategy(args: argparse.Namespace) -> None:
    payments = X402Payments()
    tx_hash = payments.register_strategy(
        bytes.fromhex(args.strategy_id.replace("0x", "")), args.cid, args.pair_id
    )
    print(json.dumps({"action": "register_strategy", "txHash": tx_hash}, indent=2))


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Interact with X402 escrow")
    sub = parser.add_subparsers(dest="command", required=True)

    deposit_cmd = sub.add_parser("deposit", help="Deposit tokens into escrow")
    deposit_cmd.add_argument("token")
    deposit_cmd.add_argument("amount")
    deposit_cmd.set_defaults(func=deposit)

    withdraw_cmd = sub.add_parser("withdraw", help="Withdraw tokens from escrow")
    withdraw_cmd.add_argument("token")
    withdraw_cmd.add_argument("amount")
    withdraw_cmd.set_defaults(func=withdraw)

    approve_cmd = sub.add_parser("approve", help="Approve escrow to spend tokens")
    approve_cmd.add_argument("token")
    approve_cmd.add_argument("amount")
    approve_cmd.set_defaults(func=approve)

    create_cmd = sub.add_parser("create-order", help="Create an execution order")
    create_cmd.add_argument("agent")
    create_cmd.add_argument("token_in")
    create_cmd.add_argument("token_out")
    create_cmd.add_argument("amount_in")
    create_cmd.add_argument("min_amount_out")
    create_cmd.add_argument("strategy_id")
    create_cmd.set_defaults(func=create_order)

    execute_cmd = sub.add_parser("execute-order", help="Execute an order")
    execute_cmd.add_argument("order_id", type=int)
    execute_cmd.add_argument("recipient")
    execute_cmd.add_argument("amount_out")
    execute_cmd.set_defaults(func=execute_order)

    cancel_cmd = sub.add_parser("cancel-order", help="Cancel a pending order")
    cancel_cmd.add_argument("order_id", type=int)
    cancel_cmd.set_defaults(func=cancel_order)

    register_cmd = sub.add_parser("register-strategy", help="Register strategy metadata")
    register_cmd.add_argument("strategy_id")
    register_cmd.add_argument("cid")
    register_cmd.add_argument("pair_id")
    register_cmd.set_defaults(func=register_strategy)

    return parser


def main() -> None:
    _ = get_settings()  # ensure .env is loaded for RPC/private key
    parser = build_parser()
    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()

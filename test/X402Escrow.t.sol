// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

import {X402Escrow} from "contracts/core/x402/X402Escrow.sol";

contract MockToken is ERC20 {
    constructor() ERC20("Mock Token", "MCK") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract X402EscrowTest is Test {
    MockToken internal token;
    X402Escrow internal escrow;

    address internal constant USER = address(0x1);
    address internal constant AGENT = address(0x2);
    address internal constant RECIPIENT = address(0x3);

    function setUp() external {
        token = new MockToken();
        escrow = new X402Escrow(address(this));

        token.mint(USER, 1_000 ether);
        vm.prank(USER);
        token.approve(address(escrow), type(uint256).max);
    }

    function testDepositAndWithdraw() external {
        vm.prank(USER);
        escrow.deposit(address(token), 100 ether);

        assertEq(escrow.balances(USER, address(token)), 100 ether);
        assertEq(token.balanceOf(address(escrow)), 100 ether);

        vm.prank(USER);
        escrow.withdraw(address(token), 40 ether);

        assertEq(escrow.balances(USER, address(token)), 60 ether);
        assertEq(token.balanceOf(USER), 940 ether);
    }

    function testCreateAndCancelOrderReturnsFunds() external {
        vm.prank(USER);
        escrow.deposit(address(token), 50 ether);

        vm.prank(USER);
        escrow.setAgent(AGENT, true);

        vm.prank(USER);
        uint256 orderId = escrow.createOrder(
            AGENT,
            address(token),
            address(token),
            20 ether,
            10 ether,
            keccak256("strategy")
        );

        assertEq(orderId, 0);
        assertEq(uint8(escrow.getOrder(orderId).status), uint8(X402Escrow.OrderStatus.Pending));
        assertEq(escrow.balances(USER, address(token)), 30 ether);

        vm.prank(USER);
        escrow.cancelOrder(orderId);

        assertEq(uint8(escrow.getOrder(orderId).status), uint8(X402Escrow.OrderStatus.Cancelled));
        assertEq(escrow.balances(USER, address(token)), 50 ether);
    }

    function testExecuteOrderByGlobalAgent() external {
        vm.prank(USER);
        escrow.deposit(address(token), 25 ether);

        escrow.setGlobalAgent(AGENT, true);

        vm.prank(USER);
        uint256 orderId = escrow.createOrder(
            AGENT,
            address(token),
            address(token),
            15 ether,
            12 ether,
            keccak256("exec")
        );

        vm.prank(AGENT);
        escrow.executeOrder(orderId, RECIPIENT, 15 ether);

        assertEq(token.balanceOf(RECIPIENT), 15 ether);
        assertEq(uint8(escrow.getOrder(orderId).status), uint8(X402Escrow.OrderStatus.Executed));
        assertEq(escrow.balances(USER, address(token)), 10 ether);
    }

    function testExecuteOrderRevertsForUnauthorisedAgent() external {
        vm.prank(USER);
        escrow.deposit(address(token), 25 ether);

        vm.prank(USER);
        uint256 orderId = escrow.createOrder(
            AGENT,
            address(token),
            address(token),
            15 ether,
            10 ether,
            keccak256("auth")
        );

        vm.expectRevert("unauthorised");
        escrow.executeOrder(orderId, RECIPIENT, 15 ether);
    }
}

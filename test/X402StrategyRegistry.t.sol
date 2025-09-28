// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {X402StrategyRegistry} from "contracts/core/x402/X402StrategyRegistry.sol";

contract X402StrategyRegistryTest is Test {
    X402StrategyRegistry internal registry;
    bytes32 internal constant STRATEGY_ID = keccak256("plan");

    function setUp() external {
        registry = new X402StrategyRegistry();
    }

    function testRegisterAndRetrieve() external {
        registry.registerStrategy(STRATEGY_ID, "cid://one", "WETH/USDC");
        X402StrategyRegistry.StrategyRecord memory record = registry.getStrategy(STRATEGY_ID);
        assertEq(record.owner, address(this));
        assertEq(record.cid, "cid://one");
        assertEq(record.pairId, "WETH/USDC");
        assertTrue(record.active);
    }

    function testUpdateStrategy() external {
        registry.registerStrategy(STRATEGY_ID, "cid://one", "pair");
        registry.updateStrategy(STRATEGY_ID, "cid://two");
        assertEq(registry.getStrategy(STRATEGY_ID).cid, "cid://two");
    }

    function testDeactivateStrategy() external {
        registry.registerStrategy(STRATEGY_ID, "cid://one", "pair");
        registry.deactivateStrategy(STRATEGY_ID);
        assertFalse(registry.getStrategy(STRATEGY_ID).active);
    }

    function testOnlyOwnerCanModify() external {
        registry.registerStrategy(STRATEGY_ID, "cid://one", "pair");
        vm.prank(address(0xBEEF));
        vm.expectRevert("not owner");
        registry.updateStrategy(STRATEGY_ID, "cid://hack");
    }
}

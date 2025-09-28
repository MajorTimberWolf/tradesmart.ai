// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "forge-std/console2.sol";

import {X402Escrow} from "contracts/core/x402/X402Escrow.sol";
import {X402StrategyRegistry} from "contracts/core/x402/X402StrategyRegistry.sol";

contract DeployX402 is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address treasury = vm.envAddress("X402_TREASURY");

        vm.startBroadcast(deployerKey);
        X402Escrow escrow = new X402Escrow(treasury);
        X402StrategyRegistry registry = new X402StrategyRegistry();
        vm.stopBroadcast();

        console2.log("X402Escrow deployed at", address(escrow));
        console2.log("X402StrategyRegistry deployed at", address(registry));
    }
}

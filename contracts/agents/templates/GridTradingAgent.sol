// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import {BaseAgent} from "../BaseAgent.sol";

/// @title GridTradingAgent
/// @notice Example agent implementing grid trading logic placeholder.
contract GridTradingAgent is BaseAgent {
    struct GridParams {
        address baseToken;
        address quoteToken;
        uint256 gridSize;
        uint256 priceRangeLow;
        uint256 priceRangeHigh;
        uint256 maxSlippageBps;
        uint256 orderCount;
        bytes dexData;
    }

    mapping(bytes32 => uint256) public activeOrders;

    constructor(
        AgentInfo memory info,
        Capability[] memory caps,
        uint256[] memory chains,
        address owner_,
        address registry_
    ) BaseAgent(info, caps, chains, owner_, registry_) {}

    /// @inheritdoc BaseAgent
    function validateExecution(
        bytes32 strategyId,
        ExecutionParams calldata params
    ) public view override returns (bool valid, string memory reason) {
        if (params.data.length == 0) {
            return (false, "GridTradingAgent: missing params");
        }

        GridParams memory decoded = abi.decode(params.data, (GridParams));
        if (decoded.baseToken == address(0) || decoded.quoteToken == address(0)) {
            return (false, "GridTradingAgent: invalid tokens");
        }
        if (decoded.gridSize == 0 || decoded.orderCount == 0) {
            return (false, "GridTradingAgent: missing grid config");
        }
        if (decoded.priceRangeLow >= decoded.priceRangeHigh) {
            return (false, "GridTradingAgent: invalid price range");
        }

        return (true, "");
    }

    /// @inheritdoc BaseAgent
    function _handleEmergencyStop(bytes32 strategyId) internal override {
        activeOrders[strategyId] = 0;
    }

    /// @inheritdoc BaseAgent
    function _executeStrategy(
        bytes32 strategyId,
        ExecutionParams calldata params
    ) internal override returns (bool, bytes memory) {
        GridParams memory decoded = abi.decode(params.data, (GridParams));

        activeOrders[strategyId] = decoded.orderCount;

        // Placeholder: integrate with on-chain DEX grids. Returning metadata.
        return (
            true,
            abi.encode(
                decoded.gridSize,
                decoded.priceRangeLow,
                decoded.priceRangeHigh,
                decoded.orderCount
            )
        );
    }
}



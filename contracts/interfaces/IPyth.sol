// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

/// @title IPyth
/// @notice Minimal interface for interacting with the Pyth price oracle on EVM chains.
interface IPyth {
    /// @dev Price structure returned by `getPrice` and `getPriceNoOlderThan`.
    struct Price {
        int64 price;
        uint64 conf;
        int32 expo;
        uint64 publishTime;
    }

    /// @notice Returns the fee that must be paid to publish the given update data.
    function getUpdateFee(bytes[] calldata updateData) external view returns (uint256);

    /// @notice Pushes fresh price updates to the on-chain Pyth contract.
    /// @dev Callers MUST provide `msg.value` equal to the value returned by `getUpdateFee`.
    function updatePriceFeeds(bytes[] calldata updateData) external payable;

    /// @notice Returns the latest price update not older than `age` seconds.
    function getPriceNoOlderThan(bytes32 priceId, uint256 age) external view returns (Price memory price);
}



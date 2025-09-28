// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title X402StrategyRegistry
/// @notice Maps off-chain strategy descriptors (e.g. Lighthouse CIDs) to owners
///         and execution metadata so the escrow/execution layer can reference a
///         canonical identifier.
contract X402StrategyRegistry {
    struct StrategyRecord {
        address owner;
        string cid;
        string pairId;
        uint64 createdAt;
        bool active;
    }

    event StrategyRegistered(bytes32 indexed strategyId, address indexed owner, string cid, string pairId);
    event StrategyUpdated(bytes32 indexed strategyId, string cid);
    event StrategyDeactivated(bytes32 indexed strategyId);

    mapping(bytes32 => StrategyRecord) private _strategies;

    modifier onlyOwner(bytes32 strategyId) {
        StrategyRecord storage record = _strategies[strategyId];
        require(record.owner != address(0), "strategy missing");
        require(record.owner == msg.sender, "not owner");
        _;
    }

    function registerStrategy(bytes32 strategyId, string calldata cid, string calldata pairId) external {
        require(strategyId != bytes32(0), "invalid id");
        StrategyRecord storage record = _strategies[strategyId];
        require(record.owner == address(0), "exists");
        _strategies[strategyId] = StrategyRecord({
            owner: msg.sender,
            cid: cid,
            pairId: pairId,
            createdAt: uint64(block.timestamp),
            active: true
        });
        emit StrategyRegistered(strategyId, msg.sender, cid, pairId);
    }

    function updateStrategy(bytes32 strategyId, string calldata newCid) external onlyOwner(strategyId) {
        StrategyRecord storage record = _strategies[strategyId];
        record.cid = newCid;
        emit StrategyUpdated(strategyId, newCid);
    }

    function deactivateStrategy(bytes32 strategyId) external onlyOwner(strategyId) {
        StrategyRecord storage record = _strategies[strategyId];
        require(record.active, "already inactive");
        record.active = false;
        emit StrategyDeactivated(strategyId);
    }

    function getStrategy(bytes32 strategyId) external view returns (StrategyRecord memory) {
        StrategyRecord memory record = _strategies[strategyId];
        require(record.owner != address(0), "strategy missing");
        return record;
    }
}

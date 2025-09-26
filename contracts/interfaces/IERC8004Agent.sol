// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import {IERC165} from "./IERC165.sol";

/// @title ERC-8004 Agent Interface
/// @notice Defines the mandatory interface for all ERC-8004 compliant agents.
/// @dev Reference: https://eips.ethereum.org/EIPS/eip-8004
interface IERC8004Agent is IERC165 {
    /// @dev Struct describing basic information about an agent.
    struct AgentInfo {
        string name;
        string version;
        address owner;
        string metadataURI; // optional off-chain metadata pointer
    }

    /// @dev Capability descriptor based on ERC-8004 spec.
    struct Capability {
        bytes32 id;
        string name;
        string description;
        bytes data; // ABI encoded capability-specific data
    }

    /// @dev Execution parameters as defined by ERC-8004.
    struct ExecutionParams {
        address initiator;
        uint256 value;
        bytes data;
    }

    /// @notice Returns core metadata describing the agent.
    function getAgentInfo() external view returns (AgentInfo memory);

    /// @notice Returns the set of declared capabilities.
    function getCapabilities() external view returns (Capability[] memory);

    /// @notice Returns the list of supported chain ids (EIP-155 identifiers).
    function getSupportedChains() external view returns (uint256[] memory);

    /// @notice Execute a strategy identified by `strategyId` with the provided parameters.
    /// @dev MUST revert if caller is not authorized or validation fails.
    function executeStrategy(
        bytes32 strategyId,
        ExecutionParams calldata params
    ) external returns (bool success, bytes memory result);

    /// @notice Validates whether the agent will accept executing the given strategy with params.
    function validateExecution(
        bytes32 strategyId,
        ExecutionParams calldata params
    ) external view returns (bool valid, string memory reason);

    /// @notice Returns the minimum stake required (in wei) to operate this agent.
    function getStakeRequirement() external view returns (uint256);

    /// @notice Returns the current reputation score for this agent.
    function getReputationScore() external view returns (uint256);

    /// @notice Suspends the agent. MUST be callable by authorized controller only.
    function pause() external;

    /// @notice Resumes the agent from paused state.
    function unpause() external;

    /// @notice Emergency stop for a specific strategy instance.
    function emergencyStop(bytes32 strategyId) external;
}



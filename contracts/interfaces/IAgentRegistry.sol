// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import {IERC165} from "./IERC165.sol";
import {IERC8004Agent} from "./IERC8004Agent.sol";

/// @title ERC-8004 Agent Registry Interface
/// @notice Registry responsible for onboarding, staking, reputation, and metadata.
interface IAgentRegistry is IERC165 {
    /// @dev Metadata stored for each registered agent.
    struct AgentMetadata {
        string name;
        string description;
        string version;
        address owner;
        uint256 stakeAmount;
        uint256 reputationScore;
        bool isActive;
        bool isImported;
        uint256 registeredAt;
        IERC8004Agent.Capability[] capabilities;
        uint256[] supportedChains;
        string cardPointer; // off-chain metadata pointer (e.g., CAIP card)
    }

    /// @notice Emitted when a new agent is registered.
    event AgentRegistered(address indexed agent, address indexed owner, bool imported);

    /// @notice Emitted when agent metadata is updated.
    event AgentMetadataUpdated(address indexed agent, AgentMetadata metadata);

    /// @notice Emitted when an agent's reputation is updated.
    event AgentReputationUpdated(address indexed agent, uint256 score, bool successfulExecution);

    /// @notice Emitted when an agent is slashed.
    event AgentSlashed(address indexed agent, uint256 amount, string reason);

    /// @notice Registers a native agent implementation.
    function registerAgent(address agent, AgentMetadata calldata metadata) external payable;

    /// @notice Imports a third-party agent providing a proof of validation.
    function importAgent(address agent, bytes calldata validationProof) external payable;

    /// @notice Updates reputation metrics for an agent after execution.
    function updateReputation(address agent, uint256 score, bool successful) external;

    /// @notice Slash a portion of an agent's stake for misbehavior.
    function slashAgent(address agent, uint256 amount, string calldata reason) external;

    /// @notice Returns metadata for a given agent.
    function getAgentMetadata(address agent) external view returns (AgentMetadata memory);

    /// @notice Returns whether an agent is registered.
    function isRegistered(address agent) external view returns (bool);

    /// @notice Returns current staked amount for an agent.
    function getStake(address agent) external view returns (uint256);
}



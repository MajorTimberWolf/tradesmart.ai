// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import {IAgentRegistry} from "../interfaces/IAgentRegistry.sol";
import {IERC165} from "../interfaces/IERC165.sol";
import {IERC8004Agent} from "../interfaces/IERC8004Agent.sol";
import {Ownable} from "../libraries/Ownable.sol";

/// @title AgentRegistry
/// @notice Reference implementation of the ERC-8004 agent registry.
contract AgentRegistry is IAgentRegistry, Ownable {
    uint256 public constant REGISTRATION_FEE = 0.01 ether;
    uint256 public constant MIN_STAKE = 0.1 ether;

    mapping(address => AgentMetadata) private _agents;
    mapping(address => bool) private _registered;
    mapping(address => uint256) private _stakes;
    mapping(address => mapping(address => uint256)) public userRatings;
    mapping(address => uint256) public totalExecutions;
    mapping(address => uint256) public successfulExecutions;

    address public validator;

    error AlreadyRegistered();
    error InvalidAgent();
    error InsufficientStake();
    error UnauthorizedValidator();
    error NotRegistered();

    modifier onlyValidator() {
        require(msg.sender == validator, "AgentRegistry: not validator");
        _;
    }

    constructor(address owner_, address validator_) Ownable(owner_) {
        require(validator_ != address(0), "AgentRegistry: validator zero");
        validator = validator_;
    }

    /// @inheritdoc IERC165
    function supportsInterface(bytes4 interfaceId) public view override returns (bool) {
        return interfaceId == type(IAgentRegistry).interfaceId || interfaceId == type(IERC165).interfaceId;
    }

    /// @inheritdoc IAgentRegistry
    function registerAgent(address agent, AgentMetadata calldata metadata) external payable override {
        _registerAgent(agent, metadata, false, "");
    }

    /// @inheritdoc IAgentRegistry
    function importAgent(address agent, bytes calldata validationProof) external payable override {
        require(validationProof.length > 0, "AgentRegistry: proof required");
        _registerAgent(agent, _decodeMetadata(validationProof), true, validationProof);
    }

    /// @inheritdoc IAgentRegistry
    function updateReputation(address agent, uint256 score, bool successful) external override onlyValidator {
        _requireRegistered(agent);

        AgentMetadata storage meta = _agents[agent];
        meta.reputationScore = score;
        totalExecutions[agent] += 1;
        if (successful) {
            successfulExecutions[agent] += 1;
        }

        emit AgentReputationUpdated(agent, score, successful);
    }

    /// @inheritdoc IAgentRegistry
    function slashAgent(address agent, uint256 amount, string calldata reason) external override onlyValidator {
        _requireRegistered(agent);
        require(amount > 0, "AgentRegistry: zero slash");

        uint256 staked = _stakes[agent];
        require(staked >= amount, "AgentRegistry: insufficient stake");

        _stakes[agent] = staked - amount;
        emit AgentSlashed(agent, amount, reason);
    }

    /// @inheritdoc IAgentRegistry
    function getAgentMetadata(address agent) external view override returns (AgentMetadata memory) {
        _requireRegistered(agent);
        return _agents[agent];
    }

    /// @inheritdoc IAgentRegistry
    function isRegistered(address agent) external view override returns (bool) {
        return _registered[agent];
    }

    /// @inheritdoc IAgentRegistry
    function getStake(address agent) external view override returns (uint256) {
        return _stakes[agent];
    }

    /// @notice Allows owner to update the validator address.
    function updateValidator(address newValidator) external onlyOwner {
        require(newValidator != address(0), "AgentRegistry: validator zero");
        validator = newValidator;
    }

    /// @notice Internal helper to register or import agents.
    function _registerAgent(
        address agent,
        AgentMetadata memory metadata,
        bool isImported,
        bytes memory validationProof
    ) internal {
        require(agent != address(0), "AgentRegistry: agent zero");
        require(msg.value >= REGISTRATION_FEE, "AgentRegistry: fee required");
        if (_registered[agent]) {
            revert AlreadyRegistered();
        }

        if (!IERC165(agent).supportsInterface(type(IERC8004Agent).interfaceId)) {
            revert InvalidAgent();
        }

        uint256 requiredStake = IERC8004Agent(agent).getStakeRequirement();
        if (requiredStake < MIN_STAKE) {
            requiredStake = MIN_STAKE;
        }
        if (metadata.stakeAmount < requiredStake) {
            revert InsufficientStake();
        }

        _stakes[agent] = metadata.stakeAmount;
        metadata.isImported = isImported;
        metadata.registeredAt = block.timestamp;

        if (metadata.capabilities.length == 0) {
            metadata.capabilities = IERC8004Agent(agent).getCapabilities();
        }
        if (metadata.supportedChains.length == 0) {
            metadata.supportedChains = IERC8004Agent(agent).getSupportedChains();
        }

        _agents[agent] = metadata;
        _registered[agent] = true;

        emit AgentRegistered(agent, metadata.owner, isImported);
        emit AgentMetadataUpdated(agent, metadata);

        // eslint-disable-next-line unused-variable
        validationProof;
    }

    function _decodeMetadata(bytes memory data) internal pure returns (AgentMetadata memory metadata) {
        return abi.decode(data, (AgentMetadata));
    }

    function _requireRegistered(address agent) internal view {
        if (!_registered[agent]) {
            revert NotRegistered();
        }
    }
}



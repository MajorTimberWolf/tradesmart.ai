// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import {IERC165} from "../interfaces/IERC165.sol";
import {IERC8004Agent} from "../interfaces/IERC8004Agent.sol";
import {Ownable} from "../libraries/Ownable.sol";
import {Pausable} from "../libraries/Pausable.sol";
import {TokenUtils} from "../libraries/TokenUtils.sol";

/// @title BaseAgent
/// @notice Abstract base contract that implements the majority of ERC-8004 agent functionality.
abstract contract BaseAgent is IERC8004Agent, Ownable, Pausable {
    /// @dev Minimum stake required for this agent. Override if strategy needs different value.
    uint256 public constant STAKE_REQUIREMENT = 1 ether;

    /// @dev Registry contract that controls reputation updates and stake slashing.
    address public immutable registry;

    /// @dev Current reputation score for the agent.
    uint256 private _reputationScore;

    AgentInfo internal _agentInfo;
    Capability[] internal _capabilities;
    uint256[] internal _supportedChains;

    mapping(address => bool) private _authorizedExecutors;

    error Unauthorized();
    error InvalidExecution(string reason);
    error UnsupportedChain(uint256 chainId);

    event ExecutorAuthorized(address indexed account, bool authorized);
    event ReputationUpdated(uint256 newScore);
    event NativeDeposited(address indexed sender, uint256 amount);
    event NativeWithdrawn(address indexed recipient, uint256 amount);
    event TokensWithdrawn(address indexed token, address indexed recipient, uint256 amount);

    modifier onlyAuthorized() {
        if (msg.sender != owner() && !_authorizedExecutors[msg.sender]) {
            revert Unauthorized();
        }
        _;
    }

    modifier onlyRegistry() {
        require(msg.sender == registry, "BaseAgent: caller not registry");
        _;
    }

    constructor(
        AgentInfo memory info,
        Capability[] memory capabilities,
        uint256[] memory chains,
        address owner_,
        address registry_
    ) Ownable(owner_) {
        require(registry_ != address(0), "BaseAgent: registry required");

        _agentInfo = info;
        _supportedChains = chains;
        registry = registry_;

        // store capabilities in storage array
        for (uint256 i = 0; i < capabilities.length; i++) {
            _capabilities.push(capabilities[i]);
        }
    }

    /// @inheritdoc IERC165
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return interfaceId == type(IERC8004Agent).interfaceId || interfaceId == type(IERC165).interfaceId;
    }

    receive() external payable {
        emit NativeDeposited(msg.sender, msg.value);
    }

    fallback() external payable {
        emit NativeDeposited(msg.sender, msg.value);
    }

    /// @inheritdoc IERC8004Agent
    function getAgentInfo() external view override returns (AgentInfo memory) {
        return _agentInfo;
    }

    /// @inheritdoc IERC8004Agent
    function getCapabilities() external view override returns (Capability[] memory caps) {
        caps = new Capability[](_capabilities.length);
        for (uint256 i = 0; i < _capabilities.length; i++) {
            caps[i] = _capabilities[i];
        }
    }

    /// @inheritdoc IERC8004Agent
    function getSupportedChains() external view override returns (uint256[] memory chains) {
        chains = new uint256[](_supportedChains.length);
        for (uint256 i = 0; i < _supportedChains.length; i++) {
            chains[i] = _supportedChains[i];
        }
    }

    /// @inheritdoc IERC8004Agent
    function executeStrategy(
        bytes32 strategyId,
        ExecutionParams calldata params
    ) external override onlyAuthorized whenNotPaused returns (bool, bytes memory) {
        (bool valid, string memory reason) = validateExecution(strategyId, params);
        if (!valid) {
            revert InvalidExecution(reason);
        }

        return _executeStrategy(strategyId, params);
    }

    /// @inheritdoc IERC8004Agent
    function getStakeRequirement() external pure override returns (uint256) {
        return STAKE_REQUIREMENT;
    }

    /// @inheritdoc IERC8004Agent
    function getReputationScore() external view override returns (uint256) {
        return _reputationScore;
    }

    /// @inheritdoc IERC8004Agent
    function pause() external override onlyOwner {
        _pause();
    }

    /// @inheritdoc IERC8004Agent
    function unpause() external override onlyOwner {
        _unpause();
    }

    /// @inheritdoc IERC8004Agent
    function emergencyStop(bytes32 strategyId) external override onlyAuthorized {
        _handleEmergencyStop(strategyId);
    }

    /// @inheritdoc IERC8004Agent
    function validateExecution(
        bytes32 strategyId,
        ExecutionParams calldata params
    ) public view virtual override returns (bool, string memory);

    /// @notice Update reputation score (registry only).
    function updateReputationScore(uint256 newScore) external onlyRegistry {
        _reputationScore = newScore;
        emit ReputationUpdated(newScore);
    }

    /// @notice Returns the native token balance held by this agent.
    function nativeBalance() public view returns (uint256) {
        return address(this).balance;
    }

    /// @notice Returns the balance for a given ERC20 token held by this agent.
    function tokenBalance(address token) public view returns (uint256) {
        return TokenUtils.balanceOf(token, address(this));
    }

    /// @notice Withdraw native tokens held by the agent to a recipient.
    function withdrawNative(address payable recipient, uint256 amount) external onlyOwner {
        require(recipient != address(0), "BaseAgent: recipient zero");
        require(amount <= address(this).balance, "BaseAgent: insufficient native");

        (bool success, ) = recipient.call{value: amount}("");
        require(success, "BaseAgent: withdraw failed");

        emit NativeWithdrawn(recipient, amount);
    }

    /// @notice Withdraw ERC20 tokens held by the agent to a recipient.
    function withdrawToken(address token, address recipient, uint256 amount) external onlyOwner {
        require(recipient != address(0), "BaseAgent: recipient zero");
        require(amount <= TokenUtils.balanceOf(token, address(this)), "BaseAgent: insufficient token");

        TokenUtils.transfer(token, recipient, amount);
        emit TokensWithdrawn(token, recipient, amount);
    }

    /// @notice Set or remove an authorized executor.
    function setAuthorizedExecutor(address account, bool authorized) external onlyOwner {
        _authorizedExecutors[account] = authorized;
        emit ExecutorAuthorized(account, authorized);
    }

    /// @notice Returns whether an address is authorized to execute strategies.
    function isAuthorizedExecutor(address account) public view returns (bool) {
        return _authorizedExecutors[account];
    }

    /// @notice Internal hook allowing children to respond to emergency stops.
    function _handleEmergencyStop(bytes32 strategyId) internal virtual;

    /// @notice Internal function to execute a strategy. Implemented by child contracts.
    function _executeStrategy(
        bytes32 strategyId,
        ExecutionParams calldata params
    ) internal virtual returns (bool, bytes memory);
}



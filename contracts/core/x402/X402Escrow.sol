// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title X402Escrow
/// @notice Lightweight escrow that locks ERC20 funds which can later be
///         released by authorised agents when an automated strategy executes.
///         The design favours clarity over maximal flexibility so the backend
///         agent can reason about balances deterministically.
contract X402Escrow {
    using SafeERC20 for IERC20;

    enum OrderStatus {
        Pending,
        Executed,
        Cancelled
    }

    struct Order {
        address owner;
        address agent;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 minAmountOut;
        bytes32 strategyId;
        OrderStatus status;
        uint64 createdAt;
    }

    event Deposited(address indexed owner, address indexed token, uint256 amount);
    event Withdrawn(address indexed owner, address indexed token, uint256 amount);
    event AgentAuthorised(address indexed owner, address indexed agent, bool allowed);
    event GlobalAgentUpdated(address indexed agent, bool allowed);
    event OrderCreated(uint256 indexed orderId, address indexed owner, address indexed agent);
    event OrderExecuted(uint256 indexed orderId, address indexed executor, address recipient, uint256 amountReleased);
    event OrderCancelled(uint256 indexed orderId, address indexed caller);

    mapping(address => mapping(address => uint256)) public balances; // user => token => amount
    mapping(address => mapping(address => bool)) public authorisedAgents; // user => agent => allowed
    mapping(address => bool) public globalAgents;
    Order[] internal _orders;

    address public immutable treasury;

    constructor(address treasuryAddress) {
        require(treasuryAddress != address(0), "treasury required");
        treasury = treasuryAddress;
    }

    modifier onlyOrderOwner(uint256 orderId) {
        require(orderId < _orders.length, "order missing");
        require(_orders[orderId].owner == msg.sender, "not order owner");
        _;
    }

    function orderCount() external view returns (uint256) {
        return _orders.length;
    }

    function getOrder(uint256 orderId) external view returns (Order memory) {
        require(orderId < _orders.length, "order missing");
        return _orders[orderId];
    }

    function deposit(address token, uint256 amount) external {
        require(amount > 0, "amount zero");
        balances[msg.sender][token] += amount;
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        emit Deposited(msg.sender, token, amount);
    }

    function withdraw(address token, uint256 amount) external {
        require(amount > 0, "amount zero");
        uint256 balance = balances[msg.sender][token];
        require(balance >= amount, "insufficient balance");
        balances[msg.sender][token] = balance - amount;
        IERC20(token).safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, token, amount);
    }

    function setAgent(address agent, bool allowed) external {
        authorisedAgents[msg.sender][agent] = allowed;
        emit AgentAuthorised(msg.sender, agent, allowed);
    }

    function setGlobalAgent(address agent, bool allowed) external {
        require(msg.sender == treasury, "only treasury");
        globalAgents[agent] = allowed;
        emit GlobalAgentUpdated(agent, allowed);
    }

    function createOrder(
        address agent,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        bytes32 strategyId
    ) external returns (uint256 orderId) {
        require(amountIn > 0, "zero amount");
        require(authorisedAgents[msg.sender][agent] || globalAgents[agent], "agent not authorised");
        uint256 balance = balances[msg.sender][tokenIn];
        require(balance >= amountIn, "balance low");

        balances[msg.sender][tokenIn] = balance - amountIn;
        orderId = _orders.length;
        _orders.push(
            Order({
                owner: msg.sender,
                agent: agent,
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                amountIn: amountIn,
                minAmountOut: minAmountOut,
                strategyId: strategyId,
                status: OrderStatus.Pending,
                createdAt: uint64(block.timestamp)
            })
        );

        emit OrderCreated(orderId, msg.sender, agent);
    }

    function cancelOrder(uint256 orderId) external onlyOrderOwner(orderId) {
        Order storage order = _orders[orderId];
        require(order.status == OrderStatus.Pending, "not pending");
        order.status = OrderStatus.Cancelled;
        balances[order.owner][order.tokenIn] += order.amountIn;
        emit OrderCancelled(orderId, msg.sender);
    }

    function executeOrder(
        uint256 orderId,
        address recipient,
        uint256 amountOut
    ) external {
        Order storage order = _orders[orderId];
        require(order.status == OrderStatus.Pending, "not pending");
        require(msg.sender == order.agent || globalAgents[msg.sender], "unauthorised");
        require(recipient != address(0), "recipient missing");
        require(amountOut >= order.minAmountOut, "slippage");

        order.status = OrderStatus.Executed;

        IERC20(order.tokenIn).safeTransfer(recipient, order.amountIn);
        emit OrderExecuted(orderId, msg.sender, recipient, order.amountIn);

        if (amountOut > order.amountIn) {
            uint256 surplus = amountOut - order.amountIn;
            IERC20(order.tokenOut).safeTransferFrom(msg.sender, order.owner, surplus);
        }
    }
}

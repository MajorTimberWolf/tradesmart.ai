// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {BaseAgent} from "../BaseAgent.sol";
import {IPyth} from "../../interfaces/IPyth.sol";
import {IAggregationRouterV5} from "../../interfaces/IAggregationRouterV5.sol";
import {IERC20} from "../../interfaces/IERC20.sol";
import {TokenUtils} from "../../libraries/TokenUtils.sol";

/// @title DCAAgent
/// @notice Dollar-cost averaging agent leveraging Pyth price checks and 1inch aggregation.
contract DCAAgent is BaseAgent {
    using TokenUtils for address;

    struct StrategyConfig {
        address tokenIn;
        address tokenOut;
        bytes32 priceId;
        uint256 intervalSeconds;
        uint256 maxPriceAge;
        uint256 maxSlippageBps;
        bool active;
    }

    struct DCAExecutionParams {
        IAggregationRouterV5.SwapDescription swap;
        address executor;
        bytes executionData;
        bytes[] priceUpdateData;
        uint256 referencePrice; // 1e18 precision
        uint256 maxUpdateFee; // upper bound for price update fee (wei)
    }

    IPyth public immutable pyth;
    address public immutable aggregationRouter;

    mapping(bytes32 => StrategyConfig) private _strategyConfigs;
    mapping(bytes32 => uint256) public lastExecution;

    event StrategyConfigured(
        bytes32 indexed strategyId,
        address tokenIn,
        address tokenOut,
        bytes32 priceId,
        uint256 intervalSeconds,
        uint256 maxPriceAge,
        uint256 maxSlippageBps,
        bool active
    );

    event StrategyExecuted(
        bytes32 indexed strategyId,
        uint256 amountIn,
        uint256 amountOut,
        uint256 referencePrice,
        uint256 executedPrice,
        uint256 updateFeePaid
    );

    constructor(
        AgentInfo memory info,
        Capability[] memory caps,
        uint256[] memory chains,
        address owner_,
        address registry_,
        address pyth_,
        address aggregationRouter_
    ) BaseAgent(info, caps, chains, owner_, registry_) {
        require(pyth_ != address(0), "DCAAgent: pyth zero");
        require(aggregationRouter_ != address(0), "DCAAgent: router zero");

        pyth = IPyth(pyth_);
        aggregationRouter = aggregationRouter_;
    }

    function getStrategyConfig(bytes32 strategyId) external view returns (StrategyConfig memory) {
        return _strategyConfigs[strategyId];
    }

    function configureStrategy(bytes32 strategyId, StrategyConfig calldata config) external onlyOwner {
        require(strategyId != bytes32(0), "DCAAgent: strategy zero");
        require(config.tokenIn != address(0) && config.tokenOut != address(0), "DCAAgent: tokens zero");
        require(config.priceId != bytes32(0), "DCAAgent: priceId zero");
        require(config.intervalSeconds > 0, "DCAAgent: interval zero");
        require(config.maxPriceAge > 0, "DCAAgent: price age zero");
        require(config.maxSlippageBps <= 10_000, "DCAAgent: slippage too high");

        _strategyConfigs[strategyId] = config;

        emit StrategyConfigured(
            strategyId,
            config.tokenIn,
            config.tokenOut,
            config.priceId,
            config.intervalSeconds,
            config.maxPriceAge,
            config.maxSlippageBps,
            config.active
        );
    }

    /// @inheritdoc BaseAgent
    function validateExecution(
        bytes32 strategyId,
        ExecutionParams calldata params
    ) public view override returns (bool valid, string memory reason) {
        StrategyConfig memory config = _strategyConfigs[strategyId];
        if (!config.active) {
            return (false, "DCAAgent: strategy inactive");
        }

        if (params.data.length == 0) {
            return (false, "DCAAgent: missing params");
        }

        DCAExecutionParams memory execParams = abi.decode(params.data, (DCAExecutionParams));

        if (execParams.executor == address(0)) {
            return (false, "DCAAgent: executor zero");
        }

        address tokenIn = address(execParams.swap.srcToken);
        address tokenOut = address(execParams.swap.dstToken);

        if (tokenIn != config.tokenIn || tokenOut != config.tokenOut) {
            return (false, "DCAAgent: token mismatch");
        }

        if (execParams.swap.amount == 0) {
            return (false, "DCAAgent: amount zero");
        }

        if (execParams.swap.dstReceiver != payable(address(this))) {
            return (false, "DCAAgent: dst receiver invalid");
        }

        if (execParams.swap.srcReceiver != payable(address(this))) {
            return (false, "DCAAgent: src receiver invalid");
        }

        if (execParams.executionData.length == 0) {
            return (false, "DCAAgent: execution data missing");
        }

        if (execParams.priceUpdateData.length == 0) {
            return (false, "DCAAgent: price update missing");
        }

        if (TokenUtils.balanceOf(tokenIn, address(this)) < execParams.swap.amount) {
            return (false, "DCAAgent: insufficient balance");
        }

        uint256 lastExec = lastExecution[strategyId];
        if (lastExec > 0 && block.timestamp < lastExec + config.intervalSeconds) {
            return (false, "DCAAgent: interval not elapsed");
        }

        if (execParams.referencePrice == 0 && config.maxSlippageBps > 0) {
            return (false, "DCAAgent: reference price missing");
        }

        return (true, "");
    }

    /// @inheritdoc BaseAgent
    function _handleEmergencyStop(bytes32 strategyId) internal override {
        lastExecution[strategyId] = block.timestamp;
    }

    /// @inheritdoc BaseAgent
    function _executeStrategy(
        bytes32 strategyId,
        ExecutionParams calldata params
    ) internal override returns (bool, bytes memory) {
        StrategyConfig memory config = _strategyConfigs[strategyId];
        require(config.active, "DCAAgent: strategy inactive");

        DCAExecutionParams memory execParams = abi.decode(params.data, (DCAExecutionParams));

        require(execParams.executor != address(0), "DCAAgent: executor zero");

        uint256 updateFeePaid = _publishPriceUpdates(execParams.priceUpdateData, execParams.maxUpdateFee);

        IPyth.Price memory priceData = pyth.getPriceNoOlderThan(config.priceId, config.maxPriceAge);
        uint256 executedPrice = _normalizePrice(priceData);

        if (config.maxSlippageBps > 0 && execParams.referencePrice > 0) {
            require(
                _isWithinSlippage(execParams.referencePrice, executedPrice, config.maxSlippageBps),
                "DCAAgent: price outside tolerance"
            );
        }

        address tokenIn = address(execParams.swap.srcToken);
        address tokenOut = address(execParams.swap.dstToken);

        require(tokenIn == config.tokenIn && tokenOut == config.tokenOut, "DCAAgent: token mismatch");
        require(execParams.swap.dstReceiver == payable(address(this)), "DCAAgent: dst receiver invalid");
        require(execParams.swap.srcReceiver == payable(address(this)), "DCAAgent: src receiver invalid");

        _ensureAllowance(execParams.swap.srcToken, execParams.swap.amount);

        uint256 balanceBefore = TokenUtils.balanceOf(tokenOut, address(this));

        (uint256 returnAmount, ) = IAggregationRouterV5(aggregationRouter).swap(
            execParams.executor,
            execParams.swap,
            execParams.executionData
        );

        uint256 balanceAfter = TokenUtils.balanceOf(tokenOut, address(this));
        uint256 received = balanceAfter - balanceBefore;

        require(received >= execParams.swap.minReturnAmount, "DCAAgent: insufficient output");

        lastExecution[strategyId] = block.timestamp;

        emit StrategyExecuted(
            strategyId,
            execParams.swap.amount,
            received,
            execParams.referencePrice,
            executedPrice,
            updateFeePaid
        );

        return (
            true,
            abi.encode(
                execParams.swap.amount,
                received,
                executedPrice,
                updateFeePaid,
                priceData.publishTime,
                returnAmount
            )
        );
    }

    function _publishPriceUpdates(bytes[] memory priceUpdateData, uint256 maxUpdateFee) internal returns (uint256) {
        if (priceUpdateData.length == 0) {
            return 0;
        }

        uint256 updateFee = pyth.getUpdateFee(priceUpdateData);
        if (maxUpdateFee != 0) {
            require(updateFee <= maxUpdateFee, "DCAAgent: update fee too high");
        }
        require(address(this).balance >= updateFee, "DCAAgent: insufficient native");

        pyth.updatePriceFeeds{value: updateFee}(priceUpdateData);
        return updateFee;
    }

    function _ensureAllowance(IERC20 token, uint256 amount) internal {
        uint256 currentAllowance = token.allowance(address(this), aggregationRouter);
        if (currentAllowance >= amount) {
            return;
        }

        TokenUtils.approve(address(token), aggregationRouter, 0);
        TokenUtils.approve(address(token), aggregationRouter, amount);
    }

    function _normalizePrice(IPyth.Price memory price) internal pure returns (uint256) {
        require(price.price > 0, "DCAAgent: invalid price");

        uint256 magnitude = uint256(uint64(price.price));
        if (price.expo < 0) {
            uint256 scale = _pow10(uint32(-price.expo));
            return (magnitude * 1e18) / scale;
        }

        uint256 multiplier = _pow10(uint32(price.expo));
        return magnitude * multiplier * 1e18;
    }

    function _pow10(uint32 exponent) internal pure returns (uint256 result) {
        result = 1;
        unchecked {
            for (uint32 i = 0; i < exponent; i++) {
                result *= 10;
            }
        }
    }

    function _isWithinSlippage(
        uint256 referencePrice,
        uint256 actualPrice,
        uint256 maxSlippageBps
    ) internal pure returns (bool) {
        if (referencePrice == 0 || maxSlippageBps == 0) {
            return true;
        }

        uint256 diff = referencePrice > actualPrice ? referencePrice - actualPrice : actualPrice - referencePrice;
        return diff * 10_000 <= referencePrice * maxSlippageBps;
    }
}


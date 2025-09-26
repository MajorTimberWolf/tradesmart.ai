// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "../interfaces/IERC20.sol";

/// @title TokenUtils
/// @notice Helper functions for handling native and ERC20 tokens safely.
library TokenUtils {
    address internal constant NATIVE_TOKEN = address(0);

    error TokenTransferFailed();
    error TokenApprovalFailed();

    function isNative(address token) internal pure returns (bool) {
        return token == NATIVE_TOKEN;
    }

    function balanceOf(address token, address account) internal view returns (uint256) {
        if (isNative(token)) {
            return account.balance;
        }
        return IERC20(token).balanceOf(account);
    }

    function transfer(
        address token,
        address to,
        uint256 amount
    ) internal {
        if (amount == 0) {
            return;
        }

        if (isNative(token)) {
            (bool success, ) = to.call{value: amount}("");
            if (!success) revert TokenTransferFailed();
        } else {
            bool success = IERC20(token).transfer(to, amount);
            if (!success) revert TokenTransferFailed();
        }
    }

    function approve(
        address token,
        address spender,
        uint256 amount
    ) internal {
        if (isNative(token)) {
            return;
        }

        bool success = IERC20(token).approve(spender, amount);
        if (!success) revert TokenApprovalFailed();
    }
}



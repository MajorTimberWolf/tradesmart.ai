// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

/// @title ERC165 Interface
/// @dev Minimal ERC165 interface definition to avoid external dependencies.
interface IERC165 {
    /// @notice Query if a contract implements an interface
    /// @param interfaceId The interface identifier, as specified in ERC-165
    /// @return `true` if the contract implements `interfaceId`
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}



//SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

interface IClaimManager {
    function hasRole(
        address subject,
        bytes32 role,
        uint256 version
    ) external view returns (bool);

    function isRevoked(bytes32 role, address subject) external view returns (bool);
}

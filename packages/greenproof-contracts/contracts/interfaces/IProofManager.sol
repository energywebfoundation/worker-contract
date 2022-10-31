// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import {IGreenProof} from "./IGreenProof.sol";

interface IProofManager {
    function revokeProof(uint256 certificateID) external;

    function claimProof(uint256 certificateID, uint256 amount) external;

    function getProof(uint256 certificateID) external view returns (IGreenProof.Certificate memory proof);

    function getProofsOf(address userAddress) external view returns (IGreenProof.Certificate[] memory);

    event ProofRevoked(uint256 indexed certificateID);

    event ProofRetired(uint256 indexed certificateID, address indexed to, uint256 indexed timestamp, uint256 amount);
}

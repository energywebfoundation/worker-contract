// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import {IGreenProof} from "./IGreenProof.sol";

interface IProofManager {
    function revokeProof(uint256 proofID) external;

    function retireProof(address from, uint256 proofID) external;

    function getProof(uint256 proofID) external view returns (IGreenProof.Proof memory proof);

    function getProofsOf(address userAddress) external view returns (IGreenProof.Proof[] memory);

    event ProofRevoked(uint256 indexed proofID);
}

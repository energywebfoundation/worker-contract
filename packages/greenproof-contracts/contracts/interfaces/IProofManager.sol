// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import {IGreenProof} from "./IGreenProof.sol";

interface IProofManager {
    function revokeProof(uint256 certificateID) external;

    function claimProof(uint256 certificateID, uint256 amount) external;

    function claimProofFor(uint256 certificateID, address owner, uint256 amount) external;

    function getProof(uint256 certificateID) external view returns (IGreenProof.Certificate memory proof);

    function getProofIdByDataHash(bytes32 dataHash) external view returns (uint256 proofId);

    function getProofsOf(address userAddress) external view returns (IGreenProof.Certificate[] memory);

    function claimedBalanceOf(address user, uint256 certificateID) external view returns (uint256);

    function verifyProof(
        bytes32 rootHash,
        bytes32 leaf,
        bytes32[] memory proof
    ) external pure returns (bool);

    event ProofRevoked(uint256 indexed certificateID);

    event ProofClaimed(uint256 indexed certificateID, address indexed to, uint256 indexed timestamp, uint256 amount);
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import {LibIssuer} from "../libraries/LibIssuer.sol";

interface IGreenProof {
    struct Proof {
        bool isRevoked;
        bool isRetired;
        uint256 index;
        uint256 issuanceDate;
        uint256 volume;
        bytes32 merkleRootProof;
    }

    function requestProofIssuance(
        bytes32 voteID,
        address recipient,
        bytes32 dataHash,
        bytes32[] memory dataProof,
        uint256 volume,
        bytes32[] memory volumeProof
    ) external;

    function discloseData(
        string memory key,
        string memory value,
        bytes32[] memory dataProof,
        bytes32[] memory proof,
        bytes32 merkleRoot,
        bytes32 dataHash
    ) external;

    function getCertificateOwners(uint256 proofID) external view returns (address[] memory);

    event ProofMinted(uint256 indexed proofID, uint256 indexed amount);
}

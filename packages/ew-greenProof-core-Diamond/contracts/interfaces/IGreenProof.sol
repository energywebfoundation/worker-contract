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

    event ProofMinted(uint256 indexed proofID, uint256 indexed amount);
    event IssuanceRequested(uint256 indexed proofID);
    event RequestAccepted(uint256 indexed proofID);
    event RequestRejected(uint256 indexed proofID);
}

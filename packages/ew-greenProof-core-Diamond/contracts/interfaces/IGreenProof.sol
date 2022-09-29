// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import {LibIssuer} from "../libraries/LibIssuer.sol";

interface IGreenProof {
    struct Proof {
        bool isRevoked;
        bool isRetired;
        uint256 index;
        uint256 issuanceDate;
        uint256 productType;
        uint256 volume;
        uint256 startTime;
        uint256 endTime;
        bytes32 producerRef;
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

    // function requestProofIssuance(bytes32 winningMatch, address recipient) external;

    // function getIssuanceRequest(bytes32 winningMatch) external view returns (LibIssuer.IssuanceRequest memory);

    // function validateIssuanceRequest(
    //     bytes32 winningMatch,
    //     bytes32 merkleRootProof,
    //     address receiver
    // ) external;

    // function validateIssuanceRequest(
    //     bytes32 winningMatch,
    //     bytes32 merkleRootProof,
    //     address receiver,
    //     uint256 amount,
    //     uint256 productType,
    //     uint256 start,
    //     uint256 end,
    //     bytes32 producerRef
    // ) external;

    event ProofMinted(uint256 indexed proofID, uint256 indexed amount);
    event IssuanceRequested(uint256 indexed proofID);
    event RequestAccepted(uint256 indexed proofID);
    event RequestRejected(uint256 indexed proofID);
}

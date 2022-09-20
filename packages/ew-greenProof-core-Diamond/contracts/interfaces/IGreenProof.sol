// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

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

    function requestProofIssuance(string memory winningMatch, address recipient) external;

    function validateIssuanceRequest(
        string memory winningMatch,
        bytes32 merkleRootProof,
        address receiver
    ) external;

    function validateIssuanceRequest(
        string memory winningMatch,
        bytes32 merkleRootProof,
        address receiver,
        uint256 amount,
        uint256 productType,
        uint256 start,
        uint256 end,
        bytes32 producerRef
    ) external;

    event ProofMinted(uint256 indexed proofID, uint256 indexed amount);
    event IssuanceRequested(uint256 indexed proofID);
    event RequestAccepted(uint256 indexed proofID);
    event RequestRejected(uint256 indexed proofID);
}

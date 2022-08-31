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
    }

    enum RequestStatus {
        DEFAULT,
        PENDING,
        REJECTED,
        ACCEPTED
    }

    struct IssuanceRequest {
        uint256 requestID;
        address recipient;
        string winningMatch;
        bytes verifiableCredentials;
        RequestStatus status;
    }

    function issueProof(
        address receiver,
        uint256 amount,
        uint256 productType,
        uint256 start,
        uint256 end,
        string memory winningMatch,
        bytes32 producerRef
    ) external;

    function retireProof(address from, uint256 proofID) external;

    function getProof(uint256 proofID) external view returns (Proof memory proof);

    function requestProofIssuance(string memory winningMatch, address recipient) external;
}

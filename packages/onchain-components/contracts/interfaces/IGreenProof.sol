// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

interface IGreenProof {
    struct Proof {
        bool isRevoked;
        bool isRetired;
        uint256 index;
        uint256 productType;
        uint256 volume;
        uint256 startTime;
        uint256 endTime;
        bytes32 producerRef;
    }

    enum RequestStatus {
        PENDING,
        REJECTED,
        ACCEPTED
    }

    struct IssuanceRequest {
        uint256 requestID;
        address recipient;
        string winningMatch;
        RequestStatus status;
    }
}
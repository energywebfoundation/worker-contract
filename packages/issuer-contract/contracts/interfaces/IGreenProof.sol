// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

interface IGreenProof {
    struct Proof {
        uint256 index;
        uint256 productType;
        uint256 volume;
        uint256 startTime;
        uint256 endTime;
        bytes32 producerRef;
        bool isRevoked;
        bool isRetired;
    }

}
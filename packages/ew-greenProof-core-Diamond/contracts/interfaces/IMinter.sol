//SPDX-Licence-Identifier: MIT
pragma solidity ^0.8.9;

interface IMinter {
    event ProofMinted(uint256 indexed proofID);
    event IssuanceRequested(uint256 indexed proofID);
    event RequestAccepted(uint256 indexed proofID);
    event RequestRejected(uint256 indexed proofID);
}

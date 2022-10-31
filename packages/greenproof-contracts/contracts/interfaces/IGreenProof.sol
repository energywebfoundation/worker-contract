// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import {LibIssuer} from "../libraries/LibIssuer.sol";

interface IGreenProof {
    struct Certificate {
        bool isRevoked;
        uint256 certificateID;
        uint256 issuanceDate;
        uint256 volume;
        bytes32 merkleRootHash;
        address generator;
    }

    function requestProofIssuance(
        bytes32 voteID,
        address recipient,
        bytes32 dataHash,
        bytes32[] memory dataProof,
        uint256 volume,
        bytes32[] memory volumeProof,
        string memory tokenUri
    ) external;

    function discloseData(
        string memory key,
        string memory value,
        bytes32[] memory dataProof,
        bytes32 dataHash
    ) external;

    function getCertificateOwners(uint256 certificateID) external view returns (address[] memory);

    event ProofMinted(uint256 indexed certificateID, uint256 indexed amount, address indexed receiver);
}

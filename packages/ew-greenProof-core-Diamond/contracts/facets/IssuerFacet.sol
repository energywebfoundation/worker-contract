// SPDX-License-Identifier: MIT
pragma solidity ^0.8.8;

import {IVoting} from "../interfaces/IVoting.sol";
import {LibIssuer} from "../libraries/LibIssuer.sol";
import {LibVoting} from "../libraries/LibVoting.sol";
import {IGreenProof} from "../interfaces/IGreenProof.sol";
import {LibProofManager} from "../libraries/LibProofManager.sol";
import {LibClaimManager} from "../libraries/LibClaimManager.sol";
import {SolidStateERC1155} from "@solidstate/contracts/token/ERC1155/SolidStateERC1155.sol";

/// @title GreenProof Issuer Module
/// @author Energyweb Fondation
/// @notice This handles certificates Issuance as Green proofs. Certificates consists on ERC-1155 tokens anchored to Verfiable Credentials
/// @dev This contract is a facet of the EW-GreenProof-Core Diamond, a gas optimized implementation of EIP-2535 Diamond standard : https://eips.ethereum.org/EIPS/eip-2535

contract IssuerFacet is SolidStateERC1155, IGreenProof {
    modifier onlyValidator() {
        LibClaimManager.ClaimManagerStorage storage claimStore = LibClaimManager.getStorage();

        uint256 lastRoleVersion = claimStore.roleToVersions[claimStore.validatorRole];
        require(LibClaimManager.isValidator(msg.sender, lastRoleVersion), "Access: Not a validator");
        _;
    }

    /** getStorage: returns a pointer to the storage  */
    function getStorage() internal pure returns (LibIssuer.IssuerStorage storage _issuer) {
        _issuer = LibIssuer._getStorage();
    }

    function requestProofIssuance(
        bytes32 voteID,
        address recipient,
        bytes32 dataHash,
        bytes32[] memory dataProof,
        uint256 volume,
        bytes32[] memory volumeProof
    ) external override onlyValidator {
        LibIssuer.IssuerStorage storage issuer = getStorage();

        require(LibVoting._isVoteRecorded(voteID), "Issuance Request : unknown vote");
        require(LibVoting._isPartOfConsensus(voteID, dataHash, dataProof), "data: Not part of this consensus");
        bytes32 volumeHash = keccak256(abi.encodePacked(("volume"), volume));
        require(LibProofManager._verifyProof(dataHash, volumeHash, volumeProof), "Volume : Not part of this consensus");

        issuer.lastProofIndex++;
        _mint(recipient, issuer.lastProofIndex, volume, "");
        LibIssuer._registerProof(issuer.lastProofIndex, dataHash);

        //TO-DO: emit an event to notify issuance
    }

    function discloseData(
        string memory key,
        string memory value,
        bytes32[] memory proof,
        bytes32 merkleRoot
    ) external {
        //TO-DO: set access control here
        bytes32 leaf = keccak256(abi.encodePacked(key, value));
        require(LibProofManager._verifyProof(merkleRoot, leaf, proof), "Disclose : data not verified");
        LibIssuer._discloseData(key, value, merkleRoot);
    }
}

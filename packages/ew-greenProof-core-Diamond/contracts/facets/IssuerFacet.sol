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
    using LibIssuer for uint256;
    using LibClaimManager for address;

    modifier onlyIssuer() {
        LibClaimManager.ClaimManagerStorage storage claimStore = LibClaimManager.getStorage();

        uint256 lastRoleVersion = claimStore.roleToVersions[claimStore.issuerRole];
        require(msg.sender.isIssuer(lastRoleVersion), "Access: Not an issuer");
        _;
    }

    function requestProofIssuance(
        bytes32 voteID,
        address recipient,
        bytes32 dataHash,
        bytes32[] memory dataProof,
        uint256 volume,
        bytes32[] memory volumeProof
    ) external override onlyIssuer {
        LibIssuer.IssuerStorage storage issuer = LibIssuer._getStorage();

        LibIssuer._incrementProofIndex();

        bool isVoteInConsensus = LibVoting._isPartOfConsensus(voteID, dataHash, dataProof);
        if (!isVoteInConsensus) {
            revert LibIssuer.NotInConsensus(voteID);
        }

        bytes32 volumeHash = volume._getVolumeHash();
        require(LibProofManager._verifyProof(dataHash, volumeHash, volumeProof), "Volume : Not part of this consensus");

        LibIssuer._registerProof(dataHash, recipient, volume, issuer.lastProofIndex);
        _mint(recipient, issuer.lastProofIndex, volume, "");
        emit LibIssuer.ProofMinted(issuer.lastProofIndex, volume);
    }

    function discloseData(
        string memory key,
        string memory value,
        bytes32[] memory proof,
        bytes32 rootHash
    ) external override onlyIssuer {
        LibIssuer.IssuerStorage storage issuer = LibIssuer._getStorage();

        require(issuer.isDataDisclosed[rootHash][key] == false, "disclosure: data already disclosed");
        bytes32 leaf = keccak256(abi.encodePacked(key, value));
        require(LibProofManager._verifyProof(rootHash, leaf, proof), "Disclose : data not verified");

        issuer.disclosedData[rootHash][key] = value;
        issuer.isDataDisclosed[rootHash][key] = true;
    }
}

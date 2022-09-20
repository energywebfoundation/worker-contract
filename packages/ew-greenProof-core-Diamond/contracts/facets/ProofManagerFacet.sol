// SPDX-License-Identifier: MIT
pragma solidity ^0.8.8;

import {LibIssuer} from "../libraries/LibIssuer.sol";
import {IGreenProof} from "../interfaces/IGreenProof.sol";
import {IProofManager} from "../interfaces/IProofManager.sol";
import {LibClaimManager} from "../libraries/LibClaimManager.sol";
import {LibProofManager} from "../libraries/LibProofManager.sol";
import {ERC1155BaseInternal, ERC1155BaseStorage} from "@solidstate/contracts/token/ERC1155/base/ERC1155BaseInternal.sol";

import {MerkleProof} from "@solidstate/contracts/cryptography/MerkleProof.sol";

contract ProofManagerFacet is IProofManager, ERC1155BaseInternal {
    modifier onlyRevoker() {
        LibClaimManager.ClaimManagerStorage storage claimStore = LibClaimManager.getStorage();

        uint256 lastRoleVersion = claimStore.roleToVersions[claimStore.revokerRole];
        require(LibClaimManager.isRevoker(msg.sender, lastRoleVersion), "Access: Not enrolled as revoker");
        _;
    }

    function verifyProof(
        // string memory winningMatch,
        bytes32 rootHash,
        bytes32 leaf,
        bytes32[] memory proof
    ) external pure returns (bool) {
        //TODO: check that the provided roothash is the same as the one stored onChain
        return MerkleProof.verify(proof, rootHash, leaf);
    }

    function retireProof(
        address from,
        uint256 proofID,
        uint256 amount
    ) external override {
        LibIssuer.IssuerStorage storage issuer = LibIssuer._getStorage();

        require(issuer.mintedProofs[proofID].isRevoked == false, "proof revoked");
        require(_balanceOf(from, proofID) >= amount, "Insufficient volume owned");
        //TODO: isApprovedForAll --> make sure we are allowed to delegate certificate management
        require(msg.sender == from || LibProofManager._isApprovedForAll(from, msg.sender), "Not allowed to retire");
        // _burn(from, issuer.mintedProofs[proofID].productType, issuer.mintedProofs[proofID].volume);
        _burn(from, proofID, amount);
        //TO-DO emit retirement event
        emit ProofRetired(proofID, from, block.timestamp, amount);
    }

    function revokeProof(uint256 proofID) external override onlyRevoker {
        LibIssuer.IssuerStorage storage issuer = LibIssuer._getStorage();
        uint256 issuanceDate = issuer.mintedProofs[proofID].issuanceDate;

        if (proofID > issuer.lastProofIndex) {
            revert LibIssuer.NonExistingProof(proofID);
        }
        require(issuer.mintedProofs[proofID].isRevoked == false, "already revoked proof");
        // if (issuer.mintedProofs[proofID].isRetired && issuanceDate + issuer.revocablePeriod > block.timestamp) {
        if (issuanceDate + issuer.revocablePeriod < block.timestamp) {
            revert LibIssuer.NonRevokableProof(proofID, issuanceDate, issuanceDate + issuer.revocablePeriod);
        }
        issuer.mintedProofs[proofID].isRevoked = true;
        emit ProofRevoked(proofID);
    }

    function getProof(uint256 proofID) external view override returns (IGreenProof.Proof memory proof) {
        LibIssuer.IssuerStorage storage issuer = LibIssuer._getStorage();

        if (proofID > issuer.lastProofIndex) {
            revert LibIssuer.NonExistingProof(proofID);
        }
        proof = issuer.mintedProofs[proofID];
    }

    function getProofsOf(address userAddress) external view override returns (IGreenProof.Proof[] memory) {
        LibIssuer.IssuerStorage storage issuer = LibIssuer._getStorage();

        require(issuer.userProofs[userAddress].length != 0, "No proofs for this address");

        return issuer.userProofs[userAddress];
    }
}

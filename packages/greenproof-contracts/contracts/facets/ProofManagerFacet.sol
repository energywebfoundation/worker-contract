// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import {LibIssuer} from "../libraries/LibIssuer.sol";
import {IGreenProof} from "../interfaces/IGreenProof.sol";
import {IProofManager} from "../interfaces/IProofManager.sol";
import {LibClaimManager} from "../libraries/LibClaimManager.sol";
import {LibProofManager} from "../libraries/LibProofManager.sol";
import {ERC1155EnumerableInternal} from "@solidstate/contracts/token/ERC1155/enumerable/ERC1155EnumerableInternal.sol";

contract ProofManagerFacet is IProofManager, ERC1155EnumerableInternal {
    using LibClaimManager for address;

    modifier onlyRevoker() {
        require(msg.sender.isEnrolledRevoker(), "Access: Not enrolled as revoker");
        _;
    }

    function retireProof(uint256 proofID, uint256 amount) external override {
        LibIssuer.IssuerStorage storage issuer = LibIssuer._getStorage();

        require(issuer.mintedProofs[proofID].isRevoked == false, "proof revoked");
        require(_balanceOf(msg.sender, proofID) >= amount, "Insufficient volume owned");
        _burn(msg.sender, proofID, amount);
        emit ProofRetired(proofID, msg.sender, block.timestamp, amount);
    }

    function revokeProof(uint256 proofID) external override onlyRevoker {
        LibIssuer.IssuerStorage storage issuer = LibIssuer._getStorage();
        uint256 issuanceDate = issuer.mintedProofs[proofID].issuanceDate;

        if (proofID > issuer.latestCertificateId) {
            revert LibIssuer.NonExistingProof(proofID);
        }
        require(issuer.mintedProofs[proofID].isRevoked == false, "already revoked proof");
        if (issuanceDate + issuer.revocablePeriod < block.timestamp) {
            revert LibIssuer.NonRevokableProof(proofID, issuanceDate, issuanceDate + issuer.revocablePeriod);
        }
        issuer.mintedProofs[proofID].isRevoked = true;
        emit ProofRevoked(proofID);
    }

    function getProof(uint256 proofID) external view override returns (IGreenProof.Proof memory proof) {
        LibIssuer.IssuerStorage storage issuer = LibIssuer._getStorage();

        if (proofID > issuer.latestCertificateId) {
            revert LibIssuer.NonExistingProof(proofID);
        }
        proof = issuer.mintedProofs[proofID];
    }

    function getProofsOf(address userAddress) external view override returns (IGreenProof.Proof[] memory) {
        LibIssuer.IssuerStorage storage issuer = LibIssuer._getStorage();

        uint256[] memory userTokenList = _tokensByAccount(userAddress);
        require(userTokenList.length != 0, "No proofs for this address");
        IGreenProof.Proof[] memory userProofs = new IGreenProof.Proof[](userTokenList.length);

        for (uint256 i = 0; i < userTokenList.length; i++) {
            uint256 currentTokenID = userTokenList[i];
            userProofs[i] = IGreenProof.Proof({
                isRevoked: issuer.mintedProofs[currentTokenID].isRevoked,
                isRetired: issuer.mintedProofs[currentTokenID].isRetired,
                certificateID: issuer.mintedProofs[currentTokenID].certificateID,
                issuanceDate: issuer.mintedProofs[currentTokenID].issuanceDate,
                volume: _balanceOf(userAddress, currentTokenID) / 10**18,
                merkleRootHash: issuer.mintedProofs[currentTokenID].merkleRootHash,
                generator: issuer.mintedProofs[currentTokenID].generator
            });
        }

        return userProofs;
    }

    function verifyProof(
        bytes32 rootHash,
        bytes32 leaf,
        bytes32[] memory proof
    ) external pure returns (bool) {
        return LibProofManager._verifyProof(rootHash, leaf, proof);
    }
}

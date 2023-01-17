// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

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

    modifier onlyClaimer() {
        require(msg.sender.isEnrolledClaimer(), "Access: Not enrolled as claimer");
        _;
    }

    function _claimProof(uint256 certificateID, address owner, uint256 amount) private {
        require(LibIssuer.isProofRevoked(certificateID) == false, "proof revoked");
        require(_balanceOf(owner, certificateID) >= amount, "Insufficient volume owned");

        LibIssuer._registerClaimedProof(certificateID, owner, amount);
        _burn(owner, certificateID, amount);
        emit ProofClaimed(certificateID, owner, block.timestamp, amount);
    }

    function claimProofFor(uint256 certificateID, address owner, uint256 amount) external onlyClaimer {
        _claimProof(certificateID, owner, amount);
    }

    function claimProof(uint256 certificateID, uint256 amount) external override {
        _claimProof(certificateID, msg.sender, amount);
    }

    function revokeProof(uint256 certificateID) external override onlyRevoker {
        if(!LibIssuer.proofExists(certificateID)) {
            revert LibIssuer.NonExistingCertificate(certificateID);
        }
        require(LibIssuer.isProofRevoked(certificateID) == false, "already revoked proof");
        uint256 issuanceDate = LibIssuer.getIssuanceDate(certificateID);
        uint256 revocablePeriod = LibIssuer.getRevocablePeriod();

        if (!LibIssuer.canBeRevoked(certificateID)) {
            revert LibIssuer.TimeToRevokeHasElapsed(certificateID, issuanceDate, revocablePeriod);
        }

        LibIssuer.revokeProof(certificateID);
        emit ProofRevoked(certificateID);
    }

    function getProof(uint256 certificateID) external view override returns (IGreenProof.Certificate memory proof) {
        if(!LibIssuer.proofExists(certificateID)) {
            revert LibIssuer.NonExistingCertificate(certificateID);
        }

        proof = LibIssuer._getCertificate(certificateID);
    }

    function getProofIdByDataHash(bytes32 dataHash) external view override returns (uint256 proofId) {
        return LibIssuer.getProofIdByDataHash(dataHash);
    }

    function getProofsOf(address userAddress) external view override returns (IGreenProof.Certificate[] memory) {
        uint256[] memory userTokenList = _tokensByAccount(userAddress);
        uint256 numberOfCertificates = userTokenList.length;

        require(numberOfCertificates != 0, "No proofs for this address");
        IGreenProof.Certificate[] memory userProofs = new IGreenProof.Certificate[](numberOfCertificates);
        for (uint256 i; i < numberOfCertificates; i++) {
            uint256 currentTokenID = userTokenList[i];
            uint256 volume = _balanceOf(userAddress, currentTokenID);
            userProofs[i] = LibIssuer._getCertificate(currentTokenID);
            userProofs[i].volume = volume;
        }

        return userProofs;
    }

    function claimedBalanceOf(address user, uint256 certificateID) external view override returns (uint256) {
        return LibIssuer.claimedBalanceOf(user, certificateID);
    }

    function verifyProof(bytes32 rootHash, bytes32 leaf, bytes32[] memory proof) external pure override returns (bool) {
        return LibProofManager._verifyProof(rootHash, leaf, proof);
    }
}

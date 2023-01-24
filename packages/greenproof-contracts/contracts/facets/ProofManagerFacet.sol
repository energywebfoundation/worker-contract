// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import {LibIssuer} from "../libraries/LibIssuer.sol";
import {IGreenProof} from "../interfaces/IGreenProof.sol";
import {IProofManager} from "../interfaces/IProofManager.sol";
import {LibClaimManager} from "../libraries/LibClaimManager.sol";
import {LibProofManager} from "../libraries/LibProofManager.sol";
import {ERC1155EnumerableInternal} from "@solidstate/contracts/token/ERC1155/enumerable/ERC1155EnumerableInternal.sol";

contract ProofManagerFacet is IProofManager, ERC1155EnumerableInternal {
    modifier onlyRevoker() {
        LibClaimManager.checkEnrolledRevoker(msg.sender);
        _;
    }

    modifier onlyClaimer() {
        LibClaimManager.checkEnrolledClaimer(msg.sender);
        _;
    }

    function claimProofFor(uint256 certificateID, address owner, uint256 amount) external onlyClaimer {
        _claimProofFor(certificateID, owner, amount);
    }

    function claimProof(uint256 certificateID, uint256 amount) external {
        _claimProofFor(certificateID, msg.sender, amount);
    }

    function revokeProof(uint256 certificateID) external onlyRevoker {
        LibProofManager.checkProofRevocability(certificateID);
        LibIssuer.revokeProof(certificateID);
        emit ProofRevoked(certificateID);
    }

    function getProof(uint256 certificateID) external view returns (IGreenProof.Certificate memory proof) {
        LibProofManager.checkProofExistence(certificateID);
        proof = LibIssuer.getProof(certificateID);
    }

    function getProofIdByDataHash(bytes32 dataHash) external view returns (uint256 proofId) {
        return LibIssuer.getProofIdByDataHash(dataHash);
    }

    function getProofsOf(address userAddress) external view returns (IGreenProof.Certificate[] memory) {
        uint256[] memory userTokenList = _tokensByAccount(userAddress);
        uint256 numberOfCertificates = userTokenList.length;

        LibProofManager.checkOwnedCertificates(numberOfCertificates, userAddress);

        IGreenProof.Certificate[] memory userProofs = new IGreenProof.Certificate[](numberOfCertificates);
        for (uint256 i; i < numberOfCertificates; i++) {
            uint256 currentTokenID = userTokenList[i];
            uint256 volume = _balanceOf(userAddress, currentTokenID);
            userProofs[i] = LibIssuer.getCertificate(currentTokenID, volume);
        }

        return userProofs;
    }

    function claimedBalanceOf(address user, uint256 certificateID) external view returns (uint256) {
        return LibIssuer.claimedBalanceOf(user, certificateID);
    }

    function verifyProof(bytes32 rootHash, bytes32 leaf, bytes32[] memory proof) external pure returns (bool) {
        return LibProofManager.verifyProof(rootHash, leaf, proof);
    }

    function _claimProofFor(uint256 certificateID, address owner, uint256 amount) private {
        uint256 ownedBalance = _balanceOf(owner, certificateID);

        LibProofManager.checkClaimableProof(certificateID, owner, amount, ownedBalance);

        LibIssuer.registerClaimedProof(certificateID, owner, amount);
        _burn(owner, certificateID, amount);
        emit ProofClaimed(certificateID, owner, block.timestamp, amount);
    }
}

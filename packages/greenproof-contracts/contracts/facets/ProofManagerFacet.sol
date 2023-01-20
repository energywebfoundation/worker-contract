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
        _claimProof(certificateID, owner, amount);
    }

    function claimProof(uint256 certificateID, uint256 amount) external {
        _claimProof(certificateID, msg.sender, amount);
    }

    function revokeProof(uint256 certificateID) external onlyRevoker {
        LibIssuer.IssuerStorage storage issuer = LibIssuer._getStorage();

        LibProofManager.checkProofExistance(certificateID);
        LibProofManager.checkNotRevokedProof(certificateID);
        LibProofManager.checkProofRevocability(certificateID);
        issuer.certificates[certificateID].isRevoked = true;
        emit ProofRevoked(certificateID);
    }

    function getProof(uint256 certificateID) external view returns (IGreenProof.Certificate memory proof) {
        LibIssuer.IssuerStorage storage issuer = LibIssuer._getStorage();
        LibProofManager.checkProofExistance(certificateID);
        proof = issuer.certificates[certificateID];
    }

    function getProofIdByDataHash(bytes32 dataHash) external view returns (uint256 proofId) {
        LibIssuer.IssuerStorage storage issuer = LibIssuer._getStorage();

        return issuer.dataToCertificateID[dataHash];
    }

    function getProofsOf(address userAddress) external view returns (IGreenProof.Certificate[] memory) {
        uint256[] memory userTokenList = _tokensByAccount(userAddress);
        uint256 numberOfCertificates = userTokenList.length;

        LibProofManager.checkOwnedCertificates(numberOfCertificates, userAddress);

        IGreenProof.Certificate[] memory userProofs = new IGreenProof.Certificate[](numberOfCertificates);
        for (uint256 i; i < numberOfCertificates; i++) {
            uint256 currentTokenID = userTokenList[i];
            uint256 volume = _balanceOf(userAddress, currentTokenID);
            userProofs[i] = LibIssuer._getCertificate(currentTokenID, volume);
        }

        return userProofs;
    }

    function claimedBalanceOf(address user, uint256 certificateID) external view returns (uint256) {
        LibIssuer.IssuerStorage storage issuer = LibIssuer._getStorage();

        return issuer.claimedBalances[certificateID][user];
    }

    function verifyProof(bytes32 rootHash, bytes32 leaf, bytes32[] memory proof) external pure returns (bool) {
        return LibProofManager._verifyProof(rootHash, leaf, proof);
    }

    function _claimProof(uint256 certificateID, address owner, uint256 amount) private {
        uint256 ownedBalance = _balanceOf(owner, certificateID);

        LibProofManager.checkNotRevokedProof(certificateID);
        LibProofManager.checkClaimedVolume(certificateID, owner, amount, ownedBalance);

        LibIssuer._registerClaimedProof(certificateID, owner, amount);
        _burn(owner, certificateID, amount);
        emit ProofClaimed(certificateID, owner, block.timestamp, amount);
    }
}

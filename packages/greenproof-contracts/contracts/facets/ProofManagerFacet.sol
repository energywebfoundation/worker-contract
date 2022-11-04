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

    function claimProof(uint256 certificateID, uint256 amount) external override {
        LibIssuer.IssuerStorage storage issuer = LibIssuer._getStorage();

        require(issuer.certificates[certificateID].isRevoked == false, "proof revoked");
        require(_balanceOf(msg.sender, certificateID) >= amount, "Insufficient volume owned");
        LibIssuer._registerClaimedProof(certificateID, msg.sender, amount);
        _burn(msg.sender, certificateID, amount);
        emit ProofClaimed(certificateID, msg.sender, block.timestamp, amount);
    }

    function revokeProof(uint256 certificateID) external override onlyRevoker {
        LibIssuer.IssuerStorage storage issuer = LibIssuer._getStorage();
        uint256 issuanceDate = issuer.certificates[certificateID].issuanceDate;

        if (certificateID > issuer.latestCertificateId) {
            revert LibIssuer.NonExistingCertificate(certificateID);
        }
        require(issuer.certificates[certificateID].isRevoked == false, "already revoked proof");
        if (issuanceDate + issuer.revocablePeriod < block.timestamp) {
            revert LibIssuer.NonRevokableCertificate(certificateID, issuanceDate, issuanceDate + issuer.revocablePeriod);
        }
        issuer.certificates[certificateID].isRevoked = true;
        emit ProofRevoked(certificateID);
    }

    function getProof(uint256 certificateID) external view override returns (IGreenProof.Certificate memory proof) {
        LibIssuer.IssuerStorage storage issuer = LibIssuer._getStorage();

        if (certificateID > issuer.latestCertificateId) {
            revert LibIssuer.NonExistingCertificate(certificateID);
        }
        proof = issuer.certificates[certificateID];
    }

    function getProofsOf(address userAddress) external view override returns (IGreenProof.Certificate[] memory) {
        uint256[] memory userTokenList = _tokensByAccount(userAddress);
        require(userTokenList.length != 0, "No proofs for this address");
        IGreenProof.Certificate[] memory userProofs = new IGreenProof.Certificate[](userTokenList.length);

        for (uint256 i = 0; i < userTokenList.length; i++) {
            uint256 currentTokenID = userTokenList[i];
            uint256 volume = _balanceOf(userAddress, currentTokenID) / 10**18;
            userProofs[i] = LibIssuer._getCertificate(currentTokenID, volume);
        }

        return userProofs;
    }

    function claimedBalanceOf(address user, uint256 certificateID) external view override returns (uint256) {
        LibIssuer.IssuerStorage storage issuer = LibIssuer._getStorage();

        return issuer.claimedBalances[certificateID][user];
    }

    function verifyProof(
        bytes32 rootHash,
        bytes32 leaf,
        bytes32[] memory proof
    ) external pure override returns (bool) {
        return LibProofManager._verifyProof(rootHash, leaf, proof);
    }
}

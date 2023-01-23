// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;
import {MerkleProof} from "@solidstate/contracts/cryptography/MerkleProof.sol";
import {LibIssuer} from "./LibIssuer.sol";

library LibProofManager {
    error ProofRevoked(uint256 certificateID);
    error InvalidProof(bytes32 rootHash, bytes32 leaf, bytes32[] proof);
    error NoProofsOwned(address user);
    error InsufficientBalance(address claimer, uint256 certificateID, uint256 claimedVolume);
    error NonExistingCertificate(uint256 certificateID);
    error TimeToRevokeElapsed(uint256 certificateID, uint256 issuanceDate, uint256 revocablePeriod);

    /**
     * @notice Checks if a certificate exists
     * @dev A certificate exists if certificates ID > 0 && certificates <= latestCertificateId
     * @dev this function reverts if the certificate ID does not exist
     * @param certificateID - ID of the certificate being checked
     */
    function checkProofExistence(uint256 certificateID) internal view {
        uint256 latestCertificateId = LibIssuer.getLatestCertificateId();

        if (certificateID > latestCertificateId) {
            revert NonExistingCertificate(certificateID);
        }
    }

    function checkProofRevocability(uint256 certificateID) internal view {
        checkProofExistence(certificateID);
        LibIssuer.IssuerStorage storage issuer = LibIssuer.getStorage();

        if (issuer.certificates[certificateID].isRevoked) {
            revert ProofRevoked(certificateID);
        }

        uint256 issuanceDate = LibIssuer.getProof(certificateID).issuanceDate;
        uint256 revocablePeriod = LibIssuer.getRevocablePeriod();
        if (issuanceDate + revocablePeriod < block.timestamp) {
            revert TimeToRevokeElapsed(certificateID, issuanceDate, revocablePeriod);
        }
    }

    function checkClaimableProof(uint256 certificateID, address claimer, uint256 claimedVolume, uint256 ownedBalance) internal view {
        LibIssuer.IssuerStorage storage issuer = LibIssuer.getStorage();

        if (issuer.certificates[certificateID].isRevoked) {
            revert ProofRevoked(certificateID);
        }

        if (ownedBalance < claimedVolume) {
            revert InsufficientBalance(claimer, certificateID, claimedVolume);
        }
    }

    function checkOwnedCertificates(uint256 numberOfOwnedCertificates, address userAddress) internal pure {
        if (numberOfOwnedCertificates == 0) {
            revert NoProofsOwned(userAddress);
        }
    }

    function checkProofValidity(bytes32 rootHash, bytes32 leaf, bytes32[] memory proof) internal pure {
        if (verifyProof(rootHash, leaf, proof) == false) {
            revert InvalidProof(rootHash, leaf, proof);
        }
    }

    function verifyProof(bytes32 rootHash, bytes32 leaf, bytes32[] memory proof) internal pure returns (bool) {
        return MerkleProof.verify(proof, rootHash, leaf);
    }
}

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
    error NonRevokableProof(uint256 certificateID, uint256 issuanceDate, uint256 revocableDateLimit);

    function checkProofExistance(uint256 certificateID) internal view {
        LibIssuer.IssuerStorage storage issuer = LibIssuer._getStorage();

        // checks that certificat does exist
        if (certificateID > issuer.latestCertificateId) {
            revert NonExistingCertificate(certificateID);
        }
    }

    function checkProofRevocability(uint256 certificateID) internal view {
        // checks that certificat does exist
        checkProofExistance(certificateID);

        LibIssuer.IssuerStorage storage issuer = LibIssuer._getStorage();

        // checks that certificate is not revokedProof
        if (issuer.certificates[certificateID].isRevoked) {
            revert ProofRevoked(certificateID);
        }

        uint256 issuanceDate = issuer.certificates[certificateID].issuanceDate;

        // checks revocable period
        if (issuanceDate + issuer.revocablePeriod < block.timestamp) {
            revert NonRevokableProof(certificateID, issuanceDate, issuanceDate + issuer.revocablePeriod);
        }
    }

    function checkClaimableProof(uint256 certificateID, address claimer, uint256 claimedVolume, uint256 ownedBalance) internal view {
        LibIssuer.IssuerStorage storage issuer = LibIssuer._getStorage();

        // checks that certificate is not revokedProof
        if (issuer.certificates[certificateID].isRevoked) {
            revert ProofRevoked(certificateID);
        }

        // checks that the claimer owns enough volume
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
        if (_verifyProof(rootHash, leaf, proof) == false) {
            revert InvalidProof(rootHash, leaf, proof);
        }
    }

    function _verifyProof(bytes32 rootHash, bytes32 leaf, bytes32[] memory proof) internal pure returns (bool) {
        return MerkleProof.verify(proof, rootHash, leaf);
    }
}

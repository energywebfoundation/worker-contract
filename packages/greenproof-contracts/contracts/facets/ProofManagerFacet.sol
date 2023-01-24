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

    /**
     * @notice claimProofFor - Claims a green certificate on behalf of an owner
     * @param certificateID ID of the certificate to claim
     * @param owner Address of the certificate owner
     * @param amount Amount of energy to claim
     */
    function claimProofFor(uint256 certificateID, address owner, uint256 amount) external onlyClaimer {
        _claimProofFor(certificateID, owner, amount);
    }

    /**
     * @notice claimProof - Claims a precise amount of certificate
     * @param certificateID - ID of the certificate to claim
     * @param amount - Amount of energy to claim
     */
    function claimProof(uint256 certificateID, uint256 amount) external {
        _claimProofFor(certificateID, msg.sender, amount);
    }

    /**
     * @notice revokeProof - Revokes a certificate
     * @dev This function emits the `ProofRevoked` event
     * @param certificateID ID of the certificate to revoke
     */
    function revokeProof(uint256 certificateID) external onlyRevoker {
        LibProofManager.checkProofRevocability(certificateID);
        LibIssuer.revokeProof(certificateID);
        emit ProofRevoked(certificateID);
    }

    /**
     * @notice getProof - Retrieves a certificate
     * @param certificateID - ID of the certificate to retrieve
     * @return proof - IGreenProof.Certificate memory proof
     */
    function getProof(uint256 certificateID) external view returns (IGreenProof.Certificate memory proof) {
        LibProofManager.checkProofExistence(certificateID);
        proof = LibIssuer.getProof(certificateID);
    }

    /**
     * @notice getProofIdByDataHash - Retrieves the ID of a green certificate by its data hash
     * @param dataHash - Data hash of the certificate
     * @return proofId - The certificate ID
     */
    function getProofIdByDataHash(bytes32 dataHash) external view returns (uint256 proofId) {
        return LibIssuer.getProofIdByDataHash(dataHash);
    }

    /**
     * @notice getProofsOf - Retrieves all certificates of a user
     * @dev This function reverts if the user has no certificates
     * @param userAddress - Address of the user
     * @return The list of all certificates owned by the userAddress
     */
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

    /**
     * @notice claimedBalanceOf - Retrieves the volume of certificate ID claimed by a user
     * @param user - Address of the user
     * @param certificateID - ID of the certificate
     * @return The effective volume claimed by the user on for this certificateID
     */
    function claimedBalanceOf(address user, uint256 certificateID) external view returns (uint256) {
        return LibIssuer.claimedBalanceOf(user, certificateID);
    }

    /**
     * @notice verifyProof - Verifies that a proof is part of a Merkle tree
     * @dev The verification of a proof is made using Openzeppelin's Merkle trees verification (https://docs.openzeppelin.com/contracts/3.x/api/cryptography#MerkleProof)
     * @param rootHash - root hash of the of the merkle tree representing the data to certify
     * @param leaf - leaf of the merkle tree representing the data to certify
     * @param proof - the proof being verified
     * @return true if the proof is valid, false otherwise
     */
    function verifyProof(bytes32 rootHash, bytes32 leaf, bytes32[] memory proof) external pure returns (bool) {
        return LibProofManager.verifyProof(rootHash, leaf, proof);
    }

    /**
     * @notice _claimProofFor - Claims a green certificate on behalf of an owner
     * @dev This function reverts if the claimedProof is revoked
     * @dev This function reverts if the claimed amount is superior than the claimer balance
     * @dev On successful claim, this function emits the `ProofClaimed` event
     * @param certificateID ID of the certificate to claim
     * @param owner Address of the certificate owner
     * @param amount Amount of energy to claim
     */
    function _claimProofFor(uint256 certificateID, address owner, uint256 amount) private {
        uint256 ownedBalance = _balanceOf(owner, certificateID);

        LibProofManager.checkClaimableProof(certificateID, owner, amount, ownedBalance);

        LibIssuer.registerClaimedProof(certificateID, owner, amount);
        _burn(owner, certificateID, amount);
        emit ProofClaimed(certificateID, owner, block.timestamp, amount);
    }
}

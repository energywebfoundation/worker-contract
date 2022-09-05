// SPDX-License-Identifier: MIT
pragma solidity ^0.8.8;

import {LibIssuer} from "../libraries/LibIssuer.sol";
import {IGreenProof} from "../interfaces/IGreenProof.sol";
import {LibClaimManager} from "../libraries/LibClaimManager.sol";
import {SolidStateERC1155} from "@solidstate/contracts/token/ERC1155/SolidStateERC1155.sol";

/// @title GreenProof Issuer Module
/// @author Energyweb Fondation
/// @notice This handles certificates Issuance as Green proofs. Certificates consists on ERC-1155 tokens anchored to Verfiable Credentials
/// @dev This contract is a facet of the EW-GreenProof-Core Diamond, a gas optimized implementation of EIP-2535 Diamond standard : https://eips.ethereum.org/EIPS/eip-2535

contract IssuerFacet is SolidStateERC1155, IGreenProof {
    modifier onlyValidator() {
        LibClaimManager.ClaimManagerStorage storage claimStore = LibClaimManager.getStorage();

        uint256 lastRoleVersion = claimStore.roleToVersions[claimStore.validatorRole];
        require(LibClaimManager.isValidator(msg.sender, lastRoleVersion), "Access: Not a validator");
        _;
    }

    // modifier onlyIssuer() {
    //     LibClaimManager.ClaimManagerStorage storage claimStore = LibClaimManager.getStorage();

    //     uint256 lastRoleVersion = claimStore.roleToVersions[claimStore.issuerRole];
    //     require(LibClaimManager.isIssuer(msg.sender, lastRoleVersion), "Access: Not an issuer");
    //     _;
    // }

    /** getStorage: returns a pointer to the storage  */
    function getStorage() internal pure returns (LibIssuer.IssuerStorage storage _issuer) {
        _issuer = LibIssuer._getStorage();
    }

    /** issueProof : Sends a request issuance of a new proof */
    function issueProof(
        address receiver,
        uint256 amount,
        uint256 productType,
        uint256 start,
        uint256 end,
        string memory winningMatch,
        bytes32 producerRef
    ) external onlyIssuer returns (uint256 proofID) {
        bool isRevoked = false;
        bool isRetired = false;

        LibIssuer.IssuerStorage storage issuer = getStorage();
        proofID = issuer.issuanceRequests[winningMatch].requestID;

        if (issuer.issuanceRequests[winningMatch].status != RequestStatus.ACCEPTED) {
            revert LibIssuer.NotValidatedProof(proofID);
        }

        Proof memory greenProof = Proof(isRevoked, isRetired, proofID, block.timestamp, productType, amount, start, end, producerRef);
        issuer.mintedProofs[proofID] = greenProof;
        issuer.userProofs[receiver].push(greenProof);

        _mint(receiver, proofID, amount, issuer.issuanceRequests[winningMatch].verifiableCredentials);
        emit LibIssuer.ProofMinted(proofID, amount);
    }

    function getProof(uint256 proofID) external view override returns (Proof memory proof) {
        LibIssuer.IssuerStorage storage issuer = getStorage();

        if (proofID > issuer.lastProofIndex) {
            revert LibIssuer.NonExistingProof(proofID);
        }
        proof = issuer.mintedProofs[proofID];
    }

    function getProofsOf(address userAddress) external view returns (Proof[] memory) {
        LibIssuer.IssuerStorage storage issuer = getStorage();

        require(issuer.userProofs[userAddress].length != 0, "No proofs for this address");

        return issuer.userProofs[userAddress];
    }

    function revokeProof(uint256 proofID) external onlyRevoker {
        LibIssuer.IssuerStorage storage issuer = getStorage();
        uint256 issuanceDate = issuer.mintedProofs[proofID].issuanceDate;

        if (proofID > issuer.lastProofIndex) {
            revert LibIssuer.NonExistingProof(proofID);
        }
        require(issuer.mintedProofs[proofID].isRevoked == false, "already revoked proof");
        //TO-DO: check that we are not allowed to revoke retired proofs after revocable period
        if (issuer.mintedProofs[proofID].isRetired && issuanceDate + issuer.revocablePeriod >= block.timestamp) {
            revert LibIssuer.NonRevokableProof(proofID, issuanceDate, block.timestamp);
        }
        //TO-DO: revoke the proof
        issuer.mintedProofs[proofID].isRevoked = true;
    }

    function retireProof(address from, uint256 proofID) external override {
        LibIssuer.IssuerStorage storage issuer = getStorage();

        require(issuer.mintedProofs[proofID].isRevoked == false, "proof revoked");
        require(issuer.mintedProofs[proofID].isRetired == false, "Proof already retired");
        require(msg.sender == from || isApprovedForAll(from, msg.sender), "Not allowed to retire");
        _burn(from, issuer.mintedProofs[proofID].productType, issuer.mintedProofs[proofID].volume);
    }

    function requestProofIssuance(string memory winningMatch, address recipient) external override {
        LibIssuer.IssuerStorage storage issuer = getStorage();

        require(
            issuer.issuanceRequests[winningMatch].status != LibIssuer.RequestStatus.PENDING &&
                issuer.issuanceRequests[winningMatch].status != LibIssuer.RequestStatus.ACCEPTED,
            "Request: Already requested proof"
        );
        issuer.lastProofIndex++;
        uint256 proofID = issuer.lastProofIndex;

        LibIssuer.IssuanceRequest memory newIssuanceRequest = LibIssuer.IssuanceRequest(
            proofID,
            recipient,
            winningMatch,
            LibIssuer.DEFAULT_VCREDENTIAL_VALUE,
            LibIssuer.RequestStatus.PENDING
        );

        issuer.issuanceRequests[winningMatch] = newIssuanceRequest;
        emit LibIssuer.IssuanceRequested(proofID);
    }

    function validateIssuanceRequest(string memory winningMatch, bytes32 merkleRootProof) external onlyValidator {
        LibIssuer._acceptRequest(winningMatch, merkleRootProof);
    }

    function validateIssuanceRequest(
        string memory winningMatch,
        bytes32 merkleRootProof,
        address receiver,
        uint256 amount,
        uint256 productType,
        uint256 start,
        uint256 end,
        bytes32 producerRef
    ) external onlyValidator {
        LibIssuer.IssuerStorage storage issuer = getStorage();

        LibIssuer._acceptRequest(winningMatch, merkleRootProof);
        LibIssuer._registerData(winningMatch, receiver, amount, productType, start, end, producerRef);
        LibIssuer._registerProof(issuer.issuanceRequests[winningMatch].requestID, merkleRootProof);

        bytes memory proof = abi.encodePacked(issuer.issuanceRequests[winningMatch].merkleRootProof);
        _mint(receiver, issuer.issuanceRequests[winningMatch].requestID, amount, proof);
        emit LibIssuer.ProofMinted(issuer.issuanceRequests[winningMatch].requestID, amount);
    }

    function rejectIssuanceRequest(string memory winningMatch) external {
        LibIssuer.IssuerStorage storage issuer = getStorage();

        require(issuer.issuanceRequests[winningMatch].requestID != 0, "Rejection: Not a valid match");
        require(issuer.issuanceRequests[winningMatch].status != LibIssuer.RequestStatus.ACCEPTED, "Rejection: Already validated");

        issuer.lastProofIndex--;
        issuer.issuanceRequests[winningMatch].status = LibIssuer.RequestStatus.REJECTED;
        emit LibIssuer.RequestRejected(issuer.issuanceRequests[winningMatch].requestID);
    }
}

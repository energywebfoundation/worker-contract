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

    /** getStorage: returns a pointer to the storage  */
    function getStorage() internal pure returns (LibIssuer.IssuerStorage storage _issuer) {
        _issuer = LibIssuer._getStorage();
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

    function validateIssuanceRequest(
        string memory winningMatch,
        bytes32 merkleRootProof,
        address receiver
    ) external onlyValidator {
        LibIssuer._acceptRequest(winningMatch, merkleRootProof);
        LibIssuer._registerPrivateData(winningMatch, receiver);
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

    function rejectIssuanceRequest(string memory winningMatch) external onlyValidator {
        LibIssuer.IssuerStorage storage issuer = getStorage();

        require(issuer.issuanceRequests[winningMatch].status != LibIssuer.RequestStatus.REJECTED, "Rejection: Already rejected");
        require(issuer.issuanceRequests[winningMatch].requestID != 0, "Rejection: Not a valid match");
        require(issuer.issuanceRequests[winningMatch].status != LibIssuer.RequestStatus.ACCEPTED, "Rejection: Already validated");

        issuer.lastProofIndex--;
        issuer.issuanceRequests[winningMatch].status = LibIssuer.RequestStatus.REJECTED;
        emit LibIssuer.RequestRejected(issuer.issuanceRequests[winningMatch].requestID);
    }
}

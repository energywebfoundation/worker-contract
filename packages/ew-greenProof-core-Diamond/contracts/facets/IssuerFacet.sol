// SPDX-License-Identifier: MIT
pragma solidity ^0.8.8;

import {IMinter} from "../interfaces/IMinter.sol";
import {LibIssuer} from "../libraries/LibIssuer.sol";
import {IGreenProof} from "../interfaces/IGreenProof.sol";
import {LibClaimManager} from "../libraries/LibClaimManager.sol";
import {SolidStateERC1155} from "@solidstate/contracts/token/ERC1155/SolidStateERC1155.sol";

/// @title GreenProof Issuer Module
/// @author Energyweb Fondation
/// @notice This handles certificates Issuance as Green proofs. Certificates consists on ERC-1155 tokens anchorded to Verfiable Credentials
/// @dev This contract is a facet of the EW-GreenProof-Core Diamond, a Gas optimized implementation of EIP-2535 Diamond standard : https://eips.ethereum.org/EIPS/eip-2535

contract IssuerFacet is SolidStateERC1155, IGreenProof {
    modifier onlyMinter() {
        //TO: set a requirement checking for authorized issuer entity
        require(LibClaimManager.isIssuer(msg.sender, lastRoleVersion), "Access: Not an issuer");
        _;
    }

    modifier onlyRevoker() {
        //TO: set a requirement checking for authorized revoker entity
        _;
    }

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
    ) external onlyIssuer {
        bool isRevoked = false;
        bool isRetired = false;

        LibIssuer.IssuerStorage storage issuer = getStorage();
        uint256 proofID = issuer.issuanceRequests[winningMatch].requestID;

        if (issuer.issuanceRequests[winningMatch].status != RequestStatus.ACCEPTED) {
            revert LibIssuer.NotValidatedProof(proofID);
        }

        Proof memory greenProof = Proof(isRevoked, isRetired, proofID, productType, amount, start, end, producerRef);
        issuer.mintedProofs[proofID] = greenProof;

        _mint(receiver, proofID, amount, "");
        emit LibIssuer.ProofMinted(proofID);
    }

    function getProof(uint256 proofID) external view override returns (Proof memory proof) {
        LibIssuer.IssuerStorage storage issuer = getStorage();

        if (proofID > issuer.lastProofIndex) {
            revert LibIssuer.NonExistingProof(proofID);
        }
        proof = issuer.mintedProofs[proofID];
    }

    function revokeProof(uint256 proofID) external onlyRevoker {
        LibIssuer.IssuerStorage storage issuer = getStorage();

        if (proofID > issuer.lastProofIndex) {
            revert LibIssuer.NonExistingProof(proofID);
        }
        require(issuer.mintedProofs[proofID].isRevoked == false, "already revoked proof");
        //TO-DO: check that we are not allowed to revoke retired proofs
        require(issuer.mintedProofs[proofID].isRetired == false, "Not allowed on retired proofs");
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
            issuer.issuanceRequests[winningMatch].status != RequestStatus.PENDING &&
                issuer.issuanceRequests[winningMatch].status != RequestStatus.ACCEPTED,
            "Request: Already requested proof"
        );
        issuer.lastProofIndex++;
        uint256 proofID = issuer.lastProofIndex;

        IssuanceRequest memory newIssuanceRequest = IssuanceRequest(
            proofID,
            recipient,
            winningMatch,
            LibIssuer.DEFAULT_VCREDENTIAL_VALUE,
            RequestStatus.PENDING
        );

        issuer.issuanceRequests[winningMatch] = newIssuanceRequest;
        emit LibIssuer.IssuanceRequested(proofID);
    }

    function validateIssuanceRequest(string memory winningMatch, bytes memory verifiableCredential) external onlyValidator {
        //TO-DO : pass VC ref
        LibIssuer.IssuerStorage storage issuer = getStorage();

        require(issuer.issuanceRequests[winningMatch].requestID != 0, "Validation: Not a valid match");
        require(issuer.issuanceRequests[winningMatch].status != RequestStatus.ACCEPTED, "validation: Already validated");

        issuer.issuanceRequests[winningMatch].status = RequestStatus.ACCEPTED;
        issuer.issuanceRequests[winningMatch].verifiableCredential = verifiableCredential;
        emit LibIssuer.RequestAccepted(issuer.issuanceRequests[winningMatch].requestID);
    }

    function rejectIssuanceRequest(string memory winningMatch) external {
        LibIssuer.IssuerStorage storage issuer = getStorage();

        require(issuer.issuanceRequests[winningMatch].requestID != 0, "Rejection: Not a valid match");
        require(issuer.issuanceRequests[winningMatch].status != RequestStatus.ACCEPTED, "Rejection: Already validated");

        issuer.lastProofIndex--;
        issuer.issuanceRequests[winningMatch].status = RequestStatus.REJECTED;
        emit LibIssuer.RequestRejected(issuer.issuanceRequests[winningMatch].requestID);
    }
}

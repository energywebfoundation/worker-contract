//SPDX-License-Identifier: MIT
pragma solidity ^0.8.8;

import {IGreenProof} from "../interfaces/IGreenProof.sol";

library LibIssuer {
    bytes32 constant ISSUER_STORAGE_POSITION = keccak256("ewc.greenproof.issuer.diamond.storage");
    bytes32 constant DEFAULT_VCREDENTIAL_VALUE = "";

    struct IssuerStorage {
        uint256 lastProofIndex;
        uint256 revocablePeriod;
        mapping(string => uint256) matchToProofIDs;
        mapping(uint256 => IGreenProof.Proof) mintedProofs;
        mapping(address => IGreenProof.Proof[]) userProofs;
        mapping(string => IssuanceRequest) issuanceRequests;
    }

    event ProofMinted(uint256 indexed proofID, uint256 indexed volume);
    event IssuanceRequested(uint256 indexed proofID); //TO-DO: Inject event params
    event RequestAccepted(uint256 indexed proofID);
    event RequestRejected(uint256 indexed proofID);

    error NotValidatedProof(uint256 proofID);
    error NonExistingProof(uint256 proofId);
    error NonRevokableProof(uint256 proofID, uint256 issuanceDate, uint256 revocableDateLimit);

    enum RequestStatus {
        DEFAULT,
        PENDING,
        REJECTED,
        ACCEPTED
    }

    struct IssuanceRequest {
        uint256 requestID;
        address recipient;
        string winningMatch;
        bytes32 merkleRootProof;
        RequestStatus status;
    }

    function _acceptRequest(string memory winningMatch, bytes32 merkleRootProof) internal {
        IssuerStorage storage issuer = _getStorage();

        require(issuer.issuanceRequests[winningMatch].requestID != 0, "Validation not requested");
        require(issuer.issuanceRequests[winningMatch].status != LibIssuer.RequestStatus.ACCEPTED, "Already validated");

        issuer.issuanceRequests[winningMatch].status = LibIssuer.RequestStatus.ACCEPTED;
        issuer.issuanceRequests[winningMatch].merkleRootProof = merkleRootProof;
        emit RequestAccepted(issuer.issuanceRequests[winningMatch].requestID);
    }

    function _getStorage() internal pure returns (IssuerStorage storage _issuerStorage) {
        bytes32 position = ISSUER_STORAGE_POSITION;

        assembly {
            _issuerStorage.slot := position
        }
    }

    function init(uint256 revocablePeriod) internal {
        IssuerStorage storage issuer = _getStorage();
        require(issuer.revocablePeriod == 0, "revocable period: already set");
        issuer.revocablePeriod = revocablePeriod;
    }

    function setRequestStatus(string memory winningMatch, RequestStatus status) internal {
        IssuerStorage storage issuer = _getStorage();

        issuer.issuanceRequests[winningMatch].status = status;
    }

    function _registerPrivateData(string memory winningMatch, address receiver) internal {
        LibIssuer.IssuerStorage storage issuer = _getStorage();
        uint256 proofID = issuer.issuanceRequests[winningMatch].requestID;
        bool isRevoked = false;
        bool isRetired = false;

        if (issuer.issuanceRequests[winningMatch].status != LibIssuer.RequestStatus.ACCEPTED) {
            revert LibIssuer.NotValidatedProof(proofID);
        }

        issuer.mintedProofs[proofID] = IGreenProof.Proof(isRevoked, isRetired, proofID, block.timestamp, 0, 0, 0, 0, "", "");
        issuer.userProofs[receiver].push(issuer.mintedProofs[proofID]);
    }

    /** issueProof : Sends a request issuance of a new proof */
    function _registerData(
        string memory winningMatch,
        address receiver,
        uint256 amount,
        uint256 productType,
        uint256 start,
        uint256 end,
        bytes32 producerRef
    ) internal {
        bool isRevoked = false;
        bool isRetired = false;

        LibIssuer.IssuerStorage storage issuer = _getStorage();
        uint256 proofID = issuer.issuanceRequests[winningMatch].requestID;

        if (issuer.issuanceRequests[winningMatch].status != LibIssuer.RequestStatus.ACCEPTED) {
            revert LibIssuer.NotValidatedProof(proofID);
        }
        issuer.mintedProofs[proofID] = IGreenProof.Proof(
            isRevoked,
            isRetired,
            proofID,
            block.timestamp,
            productType,
            amount,
            start,
            end,
            producerRef,
            ""
        );
        issuer.userProofs[receiver].push(issuer.mintedProofs[proofID]);
    }

    function _registerProof(uint256 proofID, bytes32 merkleRootProof) internal {
        LibIssuer.IssuerStorage storage issuer = _getStorage();
        issuer.mintedProofs[proofID].merkleRootProof = merkleRootProof;
    }
}

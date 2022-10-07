//SPDX-License-Identifier: MIT
pragma solidity ^0.8.8;

import {IVoting} from "../interfaces/IVoting.sol";
import {IGreenProof} from "../interfaces/IGreenProof.sol";

import {UintUtils} from "@solidstate/contracts/utils/UintUtils.sol";

library LibIssuer {
    bytes32 constant ISSUER_STORAGE_POSITION = keccak256("ewc.greenproof.issuer.diamond.storage");
    bytes32 constant DEFAULT_VCREDENTIAL_VALUE = "";

    struct IssuerStorage {
        uint256 lastProofIndex;
        uint256 revocablePeriod;
        mapping(string => uint256) matchToProofIDs;
        mapping(uint256 => IGreenProof.Proof) mintedProofs;
        mapping(address => IGreenProof.Proof[]) userProofs;
        mapping(bytes32 => IssuanceRequest) issuanceRequests;
        mapping(bytes32 => mapping(string => string)) disclosedData;
        //checks that data is disclosed for a specific key (string) of a precise certificate (bytes32)
        mapping(bytes32 => mapping(string => bool)) isDataDisclosed;
    }

    event ProofMinted(uint256 indexed proofID, uint256 indexed volume);
    event IssuanceRequested(uint256 indexed proofID);
    event RequestRejected(uint256 indexed proofID);

    // error NotValidatedProof(uint256 proofID);
    error NonExistingProof(uint256 proofId);
    error NonRevokableProof(uint256 proofID, uint256 issuanceDate, uint256 revocableDateLimit);
    error NotInConsensus(bytes32 voteID);
    enum RequestStatus {
        DEFAULT,
        PENDING,
        REJECTED,
        ACCEPTED
    }

    struct IssuanceRequest {
        uint256 requestID;
        address recipient;
        bytes32 winningMatch;
        bytes32 merkleRootProof;
        RequestStatus status;
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

    function _incrementProofIndex() internal {
        IssuerStorage storage issuer = _getStorage();
        issuer.lastProofIndex++;
    }

    function _getVolumeHash(uint256 volume) internal pure returns (bytes32 volumeHash) {
        string memory volumeString = UintUtils.toString(volume);
        volumeHash = keccak256(abi.encodePacked("volume", volumeString));
    }

    function _registerProof(
        bytes32 dataHash,
        address receiver,
        uint256 amount,
        uint256 proofID
    ) internal {
        bool isRevoked = false;
        bool isRetired = false;

        LibIssuer.IssuerStorage storage issuer = _getStorage();

        issuer.mintedProofs[proofID] = IGreenProof.Proof(isRevoked, isRetired, proofID, block.timestamp, amount, dataHash);
        issuer.userProofs[receiver].push(issuer.mintedProofs[proofID]);
    }
}

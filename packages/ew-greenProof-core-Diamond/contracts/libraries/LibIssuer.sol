//SPDX-License-Identifier: MIT
pragma solidity ^0.8.8;

import {IGreenProof} from "../interfaces/IGreenProof.sol";

library LibIssuer {
    bytes32 constant ISSUER_STORAGE_POSITION = keccak256("ewc.greenproof.issuer.diamond.storage");
    bytes constant DEFAULT_VCREDENTIAL_VALUE = "";

    struct IssuerStorage {
        uint256 lastProofIndex;
        uint256 revocablePeriod;
        mapping(uint256 => IGreenProof.Proof) mintedProofs;
        mapping(address => IGreenProof.Proof[]) userProofs;
        mapping(string => IGreenProof.IssuanceRequest) issuanceRequests;
    }

    event ProofMinted(uint256 indexed proofID);
    event IssuanceRequested(uint256 indexed proofID); //TO-DO: Inject event params
    event RequestAccepted(uint256 indexed proofID);
    event RequestRejected(uint256 indexed proofID);

    error NotValidatedProof(uint256 proofID);
    error NonExistingProof(uint256 proofId);
    error NonRevokableProof(uint256 proofID, uint256 issuanceDate, uint256 revocationDate);

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
}

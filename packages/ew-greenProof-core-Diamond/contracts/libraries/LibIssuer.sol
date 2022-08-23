//SPDX-License-Identifier: MIT
pragma solidity ^0.8.8;

import {IGreenProof} from "../interfaces/IGreenProof.sol";

library LibIssuer {
    bytes32 constant ISSUER_STORAGE_POSITION = keccak256("ewc.greenproof.issuer.diamond.storage");
    bytes constant DEFAULT_VCREDENTIAL_VALUE = "";

    struct IssuerStorage {
        uint256 lastProofIndex;
        mapping(uint256 => IGreenProof.Proof) mintedProofs;
        mapping(string => IGreenProof.IssuanceRequest) issuanceRequests;
    }

    event ProofMinted(uint256 indexed proofID);
    event IssuanceRequested(uint256 indexed proofID); //TO-DO: Inject event params
    event RequestAccepted(uint256 indexed proofID);
    event RequestRejected(uint256 indexed proofID);

    error NotValidatedProof(uint256 proofID);
    error NonExistingProof(uint256 proofId);

    function _getStorage() internal pure returns (IssuerStorage storage _issuerStorage) {
        bytes32 position = ISSUER_STORAGE_POSITION;

        assembly {
            _issuerStorage.slot := position
        }
    }
}

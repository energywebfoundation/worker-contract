//SPDX-Licence-Identifer: MIT
pragma solidity ^0.8.8;

import { IGreenProof } from "../interfaces/IGreenProof.sol";

library LibIssuer {
    bytes32 constant ISSUER_STORAGE_POSITION = keccak256("ewc.greenproof.issuer.diamond.storage");

    struct IssuerStorage {
        uint256 lastProofIndex;
        mapping(uint256 => IGreenProof.Proof) mintedProofs;
    }

    event ProofMinted(uint256 indexed proofID);

    function _getStorage() internal pure returns (IssuerStorage storage _issuerStorage) {
        bytes32 position = ISSUER_STORAGE_POSITION;

        assembly {
            _issuerStorage.slot := position
        }
    }
}
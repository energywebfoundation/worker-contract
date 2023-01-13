// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;
import {MerkleProof} from "@solidstate/contracts/cryptography/MerkleProof.sol";
import {LibIssuer} from "./LibIssuer.sol";
import {ERC1155BaseStorage} from "@solidstate/contracts/token/ERC1155/base/ERC1155BaseInternal.sol";

library LibProofManager {
    error ProofRevoked(uint256 certificateID);
    error InvalidProof(bytes32 rootHash, bytes32 leaf, bytes32[] proof);

    function checkProofRevocation(uint256 certificateID) internal view {
        LibIssuer.IssuerStorage storage issuer = LibIssuer._getStorage();

        if (issuer.certificates[certificateID].isRevoked) {
            revert ProofRevoked(certificateID);
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

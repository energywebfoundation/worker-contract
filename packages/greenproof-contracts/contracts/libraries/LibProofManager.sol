// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;
import {MerkleProof} from "@solidstate/contracts/cryptography/MerkleProof.sol";

library LibProofManager {
    function _verifyProof(bytes32 rootHash, bytes32 leaf, bytes32[] memory proof) internal pure returns (bool) {
        return MerkleProof.verify(proof, rootHash, leaf);
    }
}

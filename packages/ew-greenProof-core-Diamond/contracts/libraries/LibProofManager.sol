// SPDX-License-Identifier: MIT
pragma solidity ^0.8.8;
import {MerkleProof} from "@solidstate/contracts/cryptography/MerkleProof.sol";
import {ERC1155BaseStorage} from "@solidstate/contracts/token/ERC1155/base/ERC1155BaseInternal.sol";

library LibProofManager {
    function _isApprovedForAll(address account, address operator) internal view returns (bool) {
        return ERC1155BaseStorage.layout().operatorApprovals[account][operator];
    }

    function _verifyProof(
        bytes32 rootHash,
        bytes32 leaf,
        bytes32[] memory proof
    ) internal pure returns (bool) {
        //TODO: check that the provided roothash is the same as the one stored onChain
        return MerkleProof.verify(proof, rootHash, leaf);
    }
}

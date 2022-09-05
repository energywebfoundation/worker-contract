// SPDX-License-Identifier: MIT
pragma solidity ^0.8.8;
import {ERC1155BaseStorage} from "@solidstate/contracts/token/ERC1155/base/ERC1155BaseInternal.sol";

library LibProofManager {
    function _isApprovedForAll(address account, address operator) internal view returns (bool) {
        return ERC1155BaseStorage.layout().operatorApprovals[account][operator];
    }
}

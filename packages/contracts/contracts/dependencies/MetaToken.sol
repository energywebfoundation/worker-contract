// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import {IMetaToken} from "../interfaces/IMetaToken.sol";
import {ProofManagerFacet} from "../facets/ProofManagerFacet.sol";
import {ERC1155Metadata} from "@solidstate/contracts/token/ERC1155/metadata/ERC1155Metadata.sol";
import {ERC1155EnumerableInternal} from "@solidstate/contracts/token/ERC1155/enumerable/ERC1155EnumerableInternal.sol";

/**
 * @title MetaToken
 * @dev This contract is used to issue derived tokens from a parent token contract.
 * @author EnergyWeb Foundation
 * @notice This contract is used to issue derived tokens from a parent token contract.
 */

contract MetaToken is IMetaToken, ERC1155EnumerableInternal, ERC1155Metadata {
    address private _admin;
    string public name;
    string public symbol;

    modifier onlyAdmin() {
        if (msg.sender != _admin) {
            revert NotAdmin(msg.sender);
        }
        _;
    }

    modifier preventZeroAddressReceiver(address receiver) {
        if (receiver == address(0)) {
            revert invalidZeroAddress();
        }
        _;
    }

    constructor(
        address admin,
        string memory _name,
        string memory _symbol
    ) {
        _admin = admin;
        name = _name;
        symbol = _symbol;
    }

    function issueMetaToken(
        uint256 tokenID,
        uint256 amount,
        address receiver,
        string memory tokenUri
    ) external onlyAdmin preventZeroAddressReceiver(receiver) {
        _safeMint(receiver, tokenID, amount, "");
        _setTokenURI(tokenID, tokenUri);
        emit MetaTokenIssued(tokenID, receiver, block.timestamp, amount);
    }

    //TODO: override the transfer functions to check if the meta token is not revoked
}

// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import {IMetaToken} from "../interfaces/IMetaToken.sol";
import {ProofManagerFacet} from "../facets/ProofManagerFacet.sol";

/**
 * @title SercToken
 * @dev This contract is used to issue SERC tokens.
 * @dev This contract is inherits from ProofManager contract, which is based on the ERC1155 standard.
 * @author EnergyWeb Foundation
 * @notice This contract is used to issue SERC tokens.
 */

contract MetaToken is ProofManagerFacet, IMetaToken {
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
        address receiver
    ) external onlyAdmin preventZeroAddressReceiver(receiver) {
        _mint(receiver, tokenID, amount, "");
        emit MetaTokenIssued(tokenID, receiver, block.timestamp, amount);
    }
}

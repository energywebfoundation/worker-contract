// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import {ERC165Storage} from "@solidstate/contracts/introspection/ERC165.sol";
import {IVoting} from "../interfaces/IVoting.sol";
import {IGreenProof} from "../interfaces/IGreenProof.sol";
import {IProofManager} from "../interfaces/IProofManager.sol";
import {IClaimManager} from "../interfaces/IClaimManager.sol";

// It is expected that this contract is customized if you want to deploy your diamond
// with data from a deployment script. Use the init function to initialize state variables
// of your diamond. Add parameters to the init funciton if you need to.

contract GreenproofInit {
    using ERC165Storage for ERC165Storage.Layout;

    // You can add parameters to this function in order to pass in
    // data to set your own state variables
    function init() external {
        ERC165Storage.Layout storage erc165 = ERC165Storage.layout();
        erc165.setSupportedInterface(type(IClaimManager).interfaceId, true);
        erc165.setSupportedInterface(type(IGreenProof).interfaceId, true);
        erc165.setSupportedInterface(type(IProofManager).interfaceId, true);
        erc165.setSupportedInterface(type(IVoting).interfaceId, true);

        // add your own state variables
        // EIP-2535 specifies that the `diamondCut` function takes two optional
        // arguments: address _init and bytes calldata _calldata
        // These arguments are used to execute an arbitrary function using delegatecall
        // in order to set state variables in the diamond during deployment or an upgrade
        // More info here: https://eips.ethereum.org/EIPS/eip-2535#diamond-interface
    }
}

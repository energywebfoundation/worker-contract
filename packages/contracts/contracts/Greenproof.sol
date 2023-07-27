// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import {GreenproofManager} from "./dependencies/GreenproofManager.sol";
import {SolidStateDiamond} from "@solidstate/contracts/proxy/diamond/SolidStateDiamond.sol";
import {Proxy} from "@solidstate/contracts/proxy/Proxy.sol";
import {IProxy} from "@solidstate/contracts/proxy/IProxy.sol";

import {LibDiamond} from "./libraries/LibDiamond.sol";
import {OwnableStorage} from "@solidstate/contracts/access/ownable/OwnableStorage.sol";

/**
 * @title Greenproof - a certification system for issuing, revoking and managing green certificates
 * @author Energyweb Foundation
 * @dev This contract is the main proxy contract of the upgradable Greenproof core module.
 */

contract Greenproof is SolidStateDiamond, GreenproofManager {
    /**
     * @notice constructor
     * @param contractOwner - address of the contract owner
     */
    constructor(address contractOwner) payable {
        if (contractOwner == address(0)) {
            revert LibDiamond.ProxyError("init: Invalid contract Owner");
        }
        OwnableStorage.layout().owner = contractOwner;
    }

    fallback() external payable override(IProxy, Proxy) {
        if (isContractPaused) {
            revert PausedContract();
        }
        address implementation = _getImplementation();

        LibDiamond.redirectToFacet(implementation);
    }
}

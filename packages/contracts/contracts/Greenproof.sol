// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import {SolidStateDiamond} from "@solidstate/contracts/proxy/diamond/SolidStateDiamond.sol";
import {Proxy} from "@solidstate/contracts/proxy/Proxy.sol";
import {IProxy} from "@solidstate/contracts/proxy/IProxy.sol";

import {LibAdmin} from "./libraries/LibAdmin.sol";
import {OwnableStorage} from "@solidstate/contracts/access/ownable/OwnableStorage.sol";

/**
 * @title Greenproof - a certification system for issuing, revoking and managing green certificates
 * @author Energyweb Foundation
 * @dev This contract is the main proxy contract of the upgradable Greenproof core module.
 */

contract Greenproof is SolidStateDiamond {
    modifier onlyAdminIfPaused() {
        // if contract is paused, only admin functions can be called
        LibAdmin.checkAdminIfPaused();
        _;
    }

    /**
     * @notice constructor
     * @param contractOwner - address of the contract owner
     * @param adminFunctions - array of administrative function signatures
     */
    constructor(address contractOwner, bytes4[] memory adminFunctions) payable {
        if (contractOwner == address(0)) {
            revert LibAdmin.ProxyError("init: Invalid contract Owner");
        }
        OwnableStorage.layout().owner = contractOwner;
        uint256 numberOfFunctions = adminFunctions.length;
        for (uint256 i; i < numberOfFunctions; i++) {
            LibAdmin.setAdminFunction(adminFunctions[i], true);
        }
    }

    fallback() external payable override(IProxy, Proxy) onlyAdminIfPaused {
        address implementation = _getImplementation();

        LibAdmin.redirectToFacet(implementation);
    }
}

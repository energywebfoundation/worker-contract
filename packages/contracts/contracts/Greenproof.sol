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

    /**
     * @notice sweepFunds - when called, this function transfers all the funds from the contract to the contract owner
     * @dev only the contract admistrator is allowed to execute this function
     */

    function sweepFunds() external {
        // Check if the caller is the owner of the contract
        LibClaimManager.checkOwnership();

        // Get the current balance of the contract
        uint256 sweptAmount = address(this).balance;

        // Send the entire balance of the contract to the owner's address using a low-level call
        (bool success, ) = owner().call{value: sweptAmount}(""); // solhint-disable-line avoid-low-level-calls
        if (!success) {
            // If the transfer fails, revert with an error message
            revert LibDiamond.ProxyError("Sweep failed");
        }

        // Emit an event to indicate that the funds have been swept
        emit Swept(block.timestamp, msg.sender, sweptAmount); // solhint-disable-line not-rely-on-time
    }

    /**
     * @notice setOwner - when called, this function updates the owner of the contract
     * @dev only the contract admistrator is allowed to execute this function
     * @param newOwner the address of the new owner
     */
    function setOwner(address newOwner) external {
        LibClaimManager.checkOwnership();
        LibIssuer.preventZeroAddressReceiver(newOwner);
        emit OwnerChanged(owner(), newOwner, block.timestamp); // solhint-disable-line not-rely-on-time
        OwnableStorage.layout().owner = newOwner;
    }
}

// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import {IAdmin} from "../interfaces/IAdmin.sol";
import {LibAdmin} from "../libraries/LibAdmin.sol";
import {LibIssuer} from "../libraries/LibIssuer.sol";
import {LibClaimManager} from "../libraries/LibClaimManager.sol";
import {AddressUtils} from "@solidstate/contracts/utils/AddressUtils.sol";
import {IOwnable} from "@solidstate/contracts/access/ownable/IOwnable.sol";
import {OwnableStorage} from "@solidstate/contracts/access/ownable/OwnableStorage.sol";

contract AdminFacet is IAdmin {
    /* solhint-disable not-rely-on-time */

    using AddressUtils for address;

    /**
     * @notice updateClaimManager
     * @param newAddress The new address of the claim manager
     * @dev Allows only the contract owner to update the claim manager address.
     * @dev This restriction is set on the internal `setClaimManagerAddress` function
     */
    function updateClaimManager(address newAddress) external {
        /**
         * @dev `setClaimManagerAddress` updates the claim manager address and retrieves the old address for logging purposes
         */
        address oldAddress = LibClaimManager.setClaimManagerAddress(newAddress);

        /**
         * @dev Emitting event for the updated claim manager address
         */
        emit ClaimManagerUpdated(oldAddress, newAddress);
    }

    /**
     * @notice updateClaimRevocationRegistry
     * @param newAddress The new address of the claim revocation registry
     * @dev Allows only the contract owner to update the claim revocation registry address
     * @dev This restriction is set on the internal `setClaimRevocationRegistry` function
     */
    function updateClaimRevocationRegistry(address newAddress) external {
        /**
         * @dev `setClaimRevocationRegistry` updates the claim revocation registry address and retrieves the old address for logging purposes
         */
        address oldAddress = LibClaimManager.setClaimRevocationRegistry(newAddress);

        /**
         * @dev Emitting event for the updated claim revocation registry address
         */
        emit ClaimsRevocationRegistryUpdated(oldAddress, newAddress);
    }

    /**
     * @notice updateIssuerVersion
     * @param newVersion The new version of the issuer role
     * @dev Allows only the contract owner to update the issuer version
     * @dev This restriction is set on the internal `setIssuerVersion` function
     */
    function updateIssuerVersion(uint256 newVersion) external {
        /**
         * @dev `setIssuerVersion` updates the issuer role version and retrieves the previous version for logging purposes
         */
        uint256 oldVersion = LibClaimManager.setIssuerVersion(newVersion);

        /**
         * @dev Emitting event for the updated issuer role version
         */
        emit IssuerVersionUpdated(oldVersion, newVersion);
    }

    /**
     * @notice updateRevokerVersion
     * @param newVersion The new version of the revoker role
     * @dev Allows only the contract owner to update the revoker version
     * @dev This restriction is set on the internal `setRevokerVersion` function
     */
    function updateRevokerVersion(uint256 newVersion) external {
        /**
         * @dev `setRevokerVersion` updates the revoker role version and retrieves the previous version for logging purposes
         */
        uint256 oldVersion = LibClaimManager.setRevokerVersion(newVersion);

        /**
         * @dev Emitting event for the updated revoker role version
         */
        emit RevokerVersionUpdated(oldVersion, newVersion);
    }

    /**
     * @notice updateWorkerVersion
     * @param newVersion The new version of the worker role
     * @dev Allows only the contract owner to update the worker version
     * @dev This restriction is set on the internal `setWorkerVersion` function
     */
    function updateWorkerVersion(uint256 newVersion) external {
        /**
         * @dev `setWorkerVersion` updates the worker role version and retrieves the previous version for logging purposes
         */
        uint256 oldVersion = LibClaimManager.setWorkerVersion(newVersion);

        /**
         * @dev Emitting event for the updated worker role version
         */
        emit WorkerVersionUpdated(oldVersion, newVersion);
    }

    /**
     * @notice updateClaimerVersion
     * @param newVersion The new version of the claimer role
     * @dev Allows only the contract owner to update the claimer version
     * @dev This restriction is set on the internal `setClaimerVersion` function
     */
    function updateClaimerVersion(uint256 newVersion) external {
        /**
         * @dev `setClaimerVersion` updates the claimer role version and retrieves the previous version for logging purposes
         */
        uint256 oldVersion = LibClaimManager.setClaimerVersion(newVersion);

        /**
         * @dev Emitting event for the updated claimer role version
         */
        emit ClaimerVersionUpdated(oldVersion, newVersion);
    }

    /**
     * @notice updateApproverVersion
     * @param newVersion The new version of the claimer role
     * @dev Allows only the contract owner to update the claimer version
     * @dev This restriction is set on the internal `setApproverVersion` function
     */
    function updateApproverVersion(uint256 newVersion) external {
        /**
         * @dev `setApproverVersion` updates the claimer role version and retrieves the previous version for logging purposes
         */
        uint256 oldVersion = LibClaimManager.setApproverVersion(newVersion);

        /**
         * @dev Emitting event for the updated claimer role version
         */
        emit ApproverVersionUpdated(oldVersion, newVersion);
    }

    /**
     * @notice pause - when called, this function prevents all calls of facet functions from being executed
     * @dev only the contract admistrator is allowed to execute this halting function
     * @dev if the system is already paused, a call to this function will revert with `AlreadyPausedContract` error
     */
    function pause() external {
        if (LibAdmin.isContractPaused()) {
            revert AlreadyPausedContract();
        }
        LibAdmin.pauseContract();

        // solhint-disable-next-line not-rely-on-time
        emit ContractPaused(block.timestamp, msg.sender);
    }

    /**
     * @notice unPause - when called, this function reverts the pausing and unlocks facet function executions
     * @dev only the contract admistrator is allowed to execute this unlocking function
     * @dev if the system is already unpaused, a call to this function will revert with `AlreadyUnpausedContract` error
     */
    function unPause() external {
        if (!LibAdmin.isContractPaused()) {
            revert AlreadyUnpausedContract();
        }
        LibAdmin.unpauseContract();

        // solhint-disable-next-line not-rely-on-time
        emit ContractUnPaused(block.timestamp, msg.sender);
    }

    /**
     * @notice declareSingleAdminFunction - when called, this function allows the contract owner to declare one single function is an admin functions
     * @dev only the contract owner is allowed to execute this function
     */
    function declareSingleAdminFunction(bytes4 functionSelector) external {
        LibAdmin.setAdminFunction(functionSelector, true);
        emit AdminFunctionDeclared(functionSelector, block.timestamp);
    }

    /**
     * @notice declareBatchAdminFunctions - when called, this function allows the contract owner to declare which functions are admin functions
     * @dev only the contract owner is allowed to execute this function
     */
    function declareBatchAdminFunctions(bytes4[] calldata functionSelectors) external {
        uint256 length = LibAdmin.checkNumberOfSelectors(functionSelectors);

        for (uint256 i; i < length; i++) {
            LibAdmin.setAdminFunction(functionSelectors[i], true);
        }
        emit AdminFunctionsDeclared(functionSelectors, block.timestamp);
    }

    /**
     * @notice removeSingleAdminFunction - when called, this function allows the contract owner to remove one single function from the admin functions list
     * @dev only the contract owner is allowed to execute this function
     */
    function removeSingleAdminFunction(bytes4 functionSelector) external {
        LibAdmin.setAdminFunction(functionSelector, false);
        emit AdminFunctionDiscarded(functionSelector, block.timestamp);
    }

    /**
     * @notice BatchAdminFunctions - when called, this function allows the contract owner to remove multiple admin functions
     * @dev only the contract owner is allowed to execute this function
     */
    function removeBatchAdminFunctions(bytes4[] calldata functionSelectors) external {
        uint256 length = LibAdmin.checkNumberOfSelectors(functionSelectors);

        for (uint256 i; i < length; i++) {
            LibAdmin.setAdminFunction(functionSelectors[i], false);
        }
        emit AdminFunctionsDiscarded(functionSelectors, block.timestamp);
    }

    /**
     * @notice sweepFunds - when called, this function transfers all the funds from the contract to the contract owner
     * @dev only the contract admistrator is allowed to execute this function
     */
    function sweepFunds() external {
        // Check if the caller is the owner of the contract
        LibClaimManager.checkOwnership();

        // Get the address of the contract owner
        address payable contractOwner = payable(IOwnable(address(this)).owner());

        // Get the current balance of the contract
        uint256 sweptAmount = address(this).balance;

        // Send the entire balance of the contract to the owner's address using a low-level call
        (bool success, ) = contractOwner.call{value: sweptAmount}(""); // solhint-disable-line avoid-low-level-calls
        if (!success) {
            // If the transfer fails, revert with an error message
            revert LibAdmin.ProxyError("Sweep failed");
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

        address currentOwner = IOwnable(address(this)).owner();
        emit OwnerChanged(currentOwner, newOwner, block.timestamp); // solhint-disable-line not-rely-on-time
        OwnableStorage.layout().owner = newOwner;
    }

    /**
     * @notice isContractPaused - returns the current state of the contract
     * @dev if the system is paused, this function will return `true`
     * @dev if the system is unpaused, this function will return `false`
     */
    function isContractPaused() external view returns (bool) {
        return LibAdmin.isContractPaused();
    }
}

//SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import {LibDiamond} from "./LibDiamond.sol";
import {IClaimManager} from "../interfaces/IClaimManager.sol";

library LibClaimManager {
    bytes32 constant CLAIM_MANAGER_STORAGE_POSITION = keccak256("ewc.greenproof.claimManager.diamond.storage");

    error NotInitializedClaimManager();

    struct ClaimManagerStorage {
        address claimManagerAddress;
    }

    function hasRole(
        address _subject,
        bytes32 _role,
        uint256 _version
    ) internal view returns (bool) {
        ClaimManagerStorage storage claimStore = getStorage();

        if (claimStore.claimManagerAddress == address(0)) {
            revert NotInitializedClaimManager();
        }
        // ExtCall : Contract deployed and managed by EnergyWeb Fondation
        return IClaimManager(claimStore.claimManagerAddress).hasRole(_subject, _role, _version);
    }

    function init(address _claimManagerAddress) internal {
        ClaimManagerStorage storage claimStore = getStorage();

        require(claimStore.claimManagerAddress == address(0), "ClaimManager Already initialized");

        claimStore.claimManagerAddress = _claimManagerAddress;
    }

    function setClaimManagerAddress(address _newAddress) internal returns (address oldAddress) {
        LibDiamond.enforceIsContractOwner();
        ClaimManagerStorage storage claimStore = getStorage();

        if (claimStore.claimManagerAddress == address(0)) {
            revert NotInitializedClaimManager();
        }
        require(_newAddress != address(0), "Invalid contract address");

        oldAddress = claimStore.claimManagerAddress;

        claimStore.claimManagerAddress = _newAddress;
    }

    function getStorage() internal pure returns (ClaimManagerStorage storage ClaimStore) {
        bytes32 position = CLAIM_MANAGER_STORAGE_POSITION;
        assembly {
            ClaimStore.slot := position
        }
    }
}

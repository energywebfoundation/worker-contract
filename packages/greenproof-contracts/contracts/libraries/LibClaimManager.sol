//SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import {LibDiamond} from "./LibDiamond.sol";
import {IClaimManager} from "../interfaces/IClaimManager.sol";

library LibClaimManager {
    bytes32 constant CLAIM_MANAGER_STORAGE_POSITION = keccak256("ewc.greenproof.claimManager.diamond.storage");

    error NotInitializedClaimManager();

    struct Role {
        bytes32 name;
        uint256 version;
    }

    struct ClaimManagerStorage {
        address claimManagerAddress;
        Role workerRole;
        Role issuerRole;
        Role revokerRole;
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
        // ExtCall : Contract deployed and managed by EnergyWeb Foundation
        return IClaimManager(claimStore.claimManagerAddress).hasRole(_subject, _role, _version);
    }

    function init(
        address _claimManagerAddress,
        bytes32 _issuerRole,
        bytes32 _revokerRole,
        bytes32 _workerRole
    ) internal {
        ClaimManagerStorage storage claimStore = getStorage();

        require(claimStore.claimManagerAddress == address(0), "ClaimManager Already initialized");

        claimStore.claimManagerAddress = _claimManagerAddress;
        claimStore.issuerRole = Role({name: _issuerRole, version: 1});
        claimStore.revokerRole = Role({name: _revokerRole, version: 1});
        claimStore.workerRole = Role({name: _workerRole, version: 1});
    }

    function setIssuerVersion(uint256 _newVersion) internal returns (uint256 oldRoleVersion) {
        LibDiamond.enforceIsContractOwner();
        ClaimManagerStorage storage claimStore = getStorage();

        require(claimStore.issuerRole.version != _newVersion, "Same version");
        oldRoleVersion = claimStore.issuerRole.version;

        claimStore.issuerRole.version = _newVersion;
    }

    function setWorkerVersion(uint256 _newVersion) internal returns (uint256 oldRoleVersion) {
        LibDiamond.enforceIsContractOwner();
        ClaimManagerStorage storage claimStore = getStorage();

        require(claimStore.workerRole.version != _newVersion, "Same version");
        oldRoleVersion = claimStore.workerRole.version;

        claimStore.workerRole.version = _newVersion;
    }

    function setRevokerVersion(uint256 _newVersion) internal returns (uint256 oldRoleVersion) {
        LibDiamond.enforceIsContractOwner();
        ClaimManagerStorage storage claimStore = getStorage();

        require(claimStore.revokerRole.version != _newVersion, "Same version");
        oldRoleVersion = claimStore.revokerRole.version;

        claimStore.revokerRole.version = _newVersion;
    }

    //TODO: provide unit tests for claimManager Update
    function setClaimManagerAddress(address _newAddress) internal returns (address oldAddress) {
        LibDiamond.enforceIsContractOwner();
        ClaimManagerStorage storage claimStore = getStorage();

        if (claimStore.claimManagerAddress == address(0)) {
            revert NotInitializedClaimManager();
        }
        require(_newAddress != address(0), "Cannot update to null address");
        require(claimStore.claimManagerAddress != _newAddress, "Same address");

        oldAddress = claimStore.claimManagerAddress;

        claimStore.claimManagerAddress = _newAddress;
    }

    function getStorage() internal pure returns (ClaimManagerStorage storage ClaimStore) {
        bytes32 position = CLAIM_MANAGER_STORAGE_POSITION;
        assembly {
            ClaimStore.slot := position
        }
    }

    function isEnrolledIssuer(address operator) internal view returns (bool) {
        ClaimManagerStorage storage claimStore = getStorage();

        return hasRole(operator, claimStore.issuerRole.name, claimStore.issuerRole.version);
    }

    function isEnrolledRevoker(address operator) internal view returns (bool) {
        ClaimManagerStorage storage claimStore = getStorage();

        return hasRole(operator, claimStore.revokerRole.name, claimStore.revokerRole.version);
    }

    function isEnrolledWorker(address operator) internal view returns (bool) {
        ClaimManagerStorage storage claimStore = getStorage();

        return hasRole(operator, claimStore.workerRole.name, claimStore.workerRole.version);
    }
}

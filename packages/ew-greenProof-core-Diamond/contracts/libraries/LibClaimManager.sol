//SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import {LibDiamond} from "./LibDiamond.sol";
import {IClaimManager} from "../interfaces/IClaimManager.sol";

library LibClaimManager {
    bytes32 constant CLAIM_MANAGER_STORAGE_POSITION = keccak256("ewc.greenproof.claimManager.diamond.storage");

    error NotInitializedClaimManager();

    struct ClaimManagerStorage {
        address claimManagerAddress;
        bytes32 workerRole;
        bytes32 issuerRole;
        bytes32 revokerRole;
        bytes32 validatorRole;
        mapping(bytes32 => uint256) roleToVersions;
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
        bytes32 _validatorRole,
        bytes32 _workerRole
    ) internal {
        ClaimManagerStorage storage claimStore = getStorage();

        require(claimStore.claimManagerAddress == address(0), "ClaimManager Already initialized");

        claimStore.claimManagerAddress = _claimManagerAddress;
        claimStore.issuerRole = _issuerRole;
        claimStore.revokerRole = _revokerRole;
        claimStore.validatorRole = _validatorRole;
        claimStore.workerRole = _workerRole;

        claimStore.roleToVersions[_issuerRole] = 1;
        claimStore.roleToVersions[_revokerRole] = 1;
        claimStore.roleToVersions[_validatorRole] = 1;
        claimStore.roleToVersions[_workerRole] = 1;
    }

    function setRoleVersion(bytes32 _role, uint256 _newVersion) internal returns (uint256 oldRoleVersion) {
        LibDiamond.enforceIsContractOwner();
        ClaimManagerStorage storage claimStore = getStorage();

        require(claimStore.roleToVersions[_role] != 0, "Non existing role");
        require(claimStore.roleToVersions[_role] != _newVersion, "Same version");

        oldRoleVersion = claimStore.roleToVersions[_role];
        claimStore.roleToVersions[_role] = _newVersion;
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

    function isIssuer(address operator, uint256 roleVersion) internal view returns (bool) {
        ClaimManagerStorage storage claimStore = getStorage();

        return hasRole(operator, claimStore.issuerRole, roleVersion);
    }

    function isValidator(address operator, uint256 roleVersion) internal view returns (bool) {
        ClaimManagerStorage storage claimStore = getStorage();

        return hasRole(operator, claimStore.validatorRole, roleVersion);
    }

    function isRevoker(address operator, uint256 roleVersion) internal view returns (bool) {
        ClaimManagerStorage storage claimStore = getStorage();

        return hasRole(operator, claimStore.revokerRole, roleVersion);
    }

    function isWorker(address operator, uint256 roleVersion) internal view returns (bool) {
        ClaimManagerStorage storage claimStore = getStorage();

        return hasRole(operator, claimStore.workerRole, roleVersion);
    }
}

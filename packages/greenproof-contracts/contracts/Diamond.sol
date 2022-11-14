// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {SolidStateDiamond} from "@solidstate/contracts/proxy/diamond/SolidStateDiamond.sol";
import {OwnableStorage} from "@solidstate/contracts/access/ownable/Ownable.sol";
import {LibReward} from "./libraries/LibReward.sol";
import {LibVoting} from "./libraries/LibVoting.sol";
import {LibIssuer} from "./libraries/LibIssuer.sol";
import {LibClaimManager} from "./libraries/LibClaimManager.sol";

contract Diamond is SolidStateDiamond {
    struct DiamondConfig {
        address contractOwner;
    }

    struct RolesConfig {
        bytes32 issuerRole;
        bytes32 revokerRole;
        bytes32 workerRole;
        address claimManagerAddress;
        address claimsRevocationRegistry;
    }

    struct VotingConfig {
        uint256 votingTimeLimit;
        uint256 rewardAmount;
        uint256 majorityPercentage;
        uint256 revocablePeriod;
        bool rewardsEnabled;
    }

    constructor(DiamondConfig memory diamondConfig, VotingConfig memory votingConfig, RolesConfig memory rolesConfig) payable {
        require(votingConfig.rewardAmount > 0, "init: Null reward amount");
        require(rolesConfig.claimManagerAddress != address(0), "init: Invalid claimManager");
        require(rolesConfig.claimsRevocationRegistry != address(0), "init: Invalid claimsRevocationRegistry");
        require(votingConfig.revocablePeriod > 0, "init: Invalid revocable period");
        require(diamondConfig.contractOwner != address(0), "init: Invalid contract Owner");
        require(votingConfig.majorityPercentage <= 100, "init: Majority percentage must be between 0 and 100");

        LibVoting.init(votingConfig.votingTimeLimit, votingConfig.majorityPercentage);
        LibIssuer.init(votingConfig.revocablePeriod);
        LibReward.initRewards(votingConfig.rewardAmount, votingConfig.rewardsEnabled);
        OwnableStorage.layout().owner = diamondConfig.contractOwner;

        LibClaimManager.init(rolesConfig.claimManagerAddress, rolesConfig.issuerRole, rolesConfig.revokerRole, rolesConfig.workerRole, rolesConfig.claimsRevocationRegistry);
    }

    function updateClaimManager(address newaddress) external returns (address oldAddress) {
        oldAddress = LibClaimManager.setClaimManagerAddress(newaddress);
    }

    //TODO: provide unit tests for RoleVersion update
    function updateIssuerVersion(uint256 newVersion) external returns (uint256 oldVersion) {
        oldVersion = LibClaimManager.setIssuerVersion(newVersion);
    }

    function updateRevokerVersion(uint256 newVersion) external returns (uint256 oldVersion) {
        oldVersion = LibClaimManager.setRevokerVersion(newVersion);
    }

    function updateWorkerVersion(uint256 newVersion) external returns (uint256 oldVersion) {
        oldVersion = LibClaimManager.setWorkerVersion(newVersion);
    }

    function setRewardsEnabled(bool rewardsEnabled) external {
        LibDiamond.enforceIsContractOwner();

        LibReward.setRewardsEnabled(rewardsEnabled);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {SolidStateDiamond} from "@solidstate/contracts/proxy/diamond/SolidStateDiamond.sol";
import {OwnableStorage} from "@solidstate/contracts/access/ownable/Ownable.sol";
import {LibReward} from "./libraries/LibReward.sol";
import {LibVoting} from "./libraries/LibVoting.sol";
import {LibIssuer} from "./libraries/LibIssuer.sol";
import {LibClaimManager} from "./libraries/LibClaimManager.sol";

contract Greenproof is SolidStateDiamond {
    struct GreenproofConfig {
        address contractOwner;
    }

    struct RolesConfig {
        bytes32 issuerRole;
        bytes32 revokerRole;
        bytes32 workerRole;
        bytes32 claimerRole;
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

    event IssuerVersionUpdated(uint256 indexed oldVersion, uint256 indexed newVersion);
    event WorkerVersionUpdated(uint256 indexed oldVersion, uint256 indexed newVersion);
    event RevokerVersionUpdated(uint256 indexed oldVersion, uint256 indexed newVersion);
    event ClaimerVersionUpdated(uint256 indexed oldVersion, uint256 indexed newVersion);
    event ClaimManagerUpdated(address indexed oldAddress, address indexed newAddress);

    constructor(GreenproofConfig memory diamondConfig, VotingConfig memory votingConfig, RolesConfig memory rolesConfig) payable {
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

        LibClaimManager.init(
            rolesConfig.claimManagerAddress,
            rolesConfig.issuerRole,
            rolesConfig.revokerRole,
            rolesConfig.workerRole,
            rolesConfig.claimerRole,
            rolesConfig.claimsRevocationRegistry
        );
    }

    function updateClaimManager(address newAddress) external {
        address oldAddress = LibClaimManager.setClaimManagerAddress(newAddress);
        emit ClaimManagerUpdated(oldAddress, newAddress);
    }

    //TODO: provide unit tests for RoleVersion update
    function updateIssuerVersion(uint256 newVersion) external {
        uint256 oldVersion = LibClaimManager.setIssuerVersion(newVersion);
        emit IssuerVersionUpdated(oldVersion, newVersion);
    }

    function updateRevokerVersion(uint256 newVersion) external {
        uint256 oldVersion = LibClaimManager.setRevokerVersion(newVersion);
        emit RevokerVersionUpdated(oldVersion, newVersion);
    }

    function updateWorkerVersion(uint256 newVersion) external {
        uint256 oldVersion = LibClaimManager.setWorkerVersion(newVersion);
        emit WorkerVersionUpdated(oldVersion, newVersion);
    }

    function updateClaimerVersion(uint256 newVersion) external {
        uint256 oldVersion = LibClaimManager.setClaimerVersion(newVersion);
        emit ClaimerVersionUpdated(oldVersion, newVersion);
    }

    function setRewardsEnabled(bool rewardsEnabled) external {
        LibReward.setRewardsEnabled(rewardsEnabled);
    }
}

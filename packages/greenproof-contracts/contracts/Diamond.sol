// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {SolidStateDiamond} from "@solidstate/contracts/proxy/diamond/SolidStateDiamond.sol";
import {OwnableStorage} from "@solidstate/contracts/access/ownable/Ownable.sol";
import {LibReward} from "./libraries/LibReward.sol";
import {LibVoting} from "./libraries/LibVoting.sol";
import {LibIssuer} from "./libraries/LibIssuer.sol";
import {LibClaimManager} from "./libraries/LibClaimManager.sol";

contract Diamond is SolidStateDiamond {
    constructor(
        address owner,
        uint256 votingTimeLimit,
        uint256 rewardAmount,
        address claimManagerAddress,
        uint256 majorityPercentage,
        bytes32 issuerRole,
        bytes32 revokerRole,
        bytes32 workerRole,
        uint256 revocablePeriod,
        address claimsRevocationRegistry
    ) payable {
        require(rewardAmount > 0, "init: Null reward amount");
        require(claimManagerAddress != address(0), "init: Invalid claimManager");
        require(claimsRevocationRegistry != address(0), "init: Invalid claimsRevocationRegistry");
        require(revocablePeriod > 0, "init: Invalid revocable period");
        require(owner != address(0), "init: Invalid contract Owner");
        require(majorityPercentage >= 0 && majorityPercentage <= 100, "init: Majority percentage must be between 0 and 100");
        LibVoting.init(votingTimeLimit, majorityPercentage);
        LibIssuer.init(revocablePeriod);
        LibReward.initRewards(rewardAmount);
        OwnableStorage.layout().owner = owner;

        //Set ClaimManager properties
        LibClaimManager.init(claimManagerAddress, issuerRole, revokerRole, workerRole, claimsRevocationRegistry);
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
}

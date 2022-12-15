// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ERC165Storage} from "@solidstate/contracts/introspection/ERC165.sol";
import {IVoting} from "../interfaces/IVoting.sol";
import {IGreenProof} from "../interfaces/IGreenProof.sol";
import {IProofManager} from "../interfaces/IProofManager.sol";
import {IClaimManager} from "../interfaces/IClaimManager.sol";
import {LibReward} from "../libraries/LibReward.sol";
import {LibVoting} from "../libraries/LibVoting.sol";
import {LibIssuer} from "../libraries/LibIssuer.sol";
import {LibClaimManager} from "../libraries/LibClaimManager.sol";
import {OwnableStorage} from "@solidstate/contracts/access/ownable/Ownable.sol";

// It is expected that this contract is customized if you want to deploy your diamond
// with data from a deployment script. Use the init function to initialize state variables
// of your diamond. Add parameters to the init funciton if you need to.

contract GreenproofInit {
    using ERC165Storage for ERC165Storage.Layout;

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

    // You can add parameters to this function in order to pass in
    // data to set your own state variables
    function init(GreenproofConfig memory diamondConfig, VotingConfig memory votingConfig, RolesConfig memory rolesConfig) external {
        ERC165Storage.Layout storage erc165 = ERC165Storage.layout();
        erc165.setSupportedInterface(type(IClaimManager).interfaceId, true);
        erc165.setSupportedInterface(type(IGreenProof).interfaceId, true);
        erc165.setSupportedInterface(type(IProofManager).interfaceId, true);
        erc165.setSupportedInterface(type(IVoting).interfaceId, true);

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
        // add your own state variables
        // EIP-2535 specifies that the `diamondCut` function takes two optional
        // arguments: address _init and bytes calldata _calldata
        // These arguments are used to execute an arbitrary function using delegatecall
        // in order to set state variables in the diamond during deployment or an upgrade
        // More info here: https://eips.ethereum.org/EIPS/eip-2535#diamond-interface
    }
}

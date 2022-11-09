// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/******************************************************************************\
*  Proxy implementing EIP-2535 Diamonds:https://eips.ethereum.org/EIPS/eip-2535
*
* Based on Nick Mudge's Nick Mudge Diamond-2-hardhat implementation
* https://github.com/mudgen/diamond-2-hardhat
*
/******************************************************************************/

import {LibReward} from "./libraries/LibReward.sol";
import {LibVoting} from "./libraries/LibVoting.sol";
import {LibIssuer} from "./libraries/LibIssuer.sol";
import {LibDiamond} from "./libraries/LibDiamond.sol";
import {IDiamondCut} from "./interfaces/IDiamondCut.sol";
import {LibClaimManager} from "./libraries/LibClaimManager.sol";

contract Diamond {
    struct DiamondConfig {
        address contractOwner;
        address diamondCutFacet;
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
        LibReward.initRewards(votingConfig.rewardAmount);
        LibDiamond.setContractOwner(diamondConfig.contractOwner);

        // Add the diamondCut external function from the diamondCutFacet
        IDiamondCut.FacetCut[] memory cut = new IDiamondCut.FacetCut[](1);
        bytes4[] memory functionSelectors = new bytes4[](1);
        functionSelectors[0] = IDiamondCut.diamondCut.selector;
        cut[0] = IDiamondCut.FacetCut({facetAddress : diamondConfig.diamondCutFacet, action : IDiamondCut.FacetCutAction.Add, functionSelectors : functionSelectors});
        LibDiamond.diamondCut(cut, address(0), "");

        //Set ClaimManager properties
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

    // Find facet for function that is called and execute the
    // function if a facet is found and return any value.
    fallback() external payable {
        LibDiamond.DiamondStorage storage ds;
        bytes32 position = LibDiamond.DIAMOND_STORAGE_POSITION;
        // get diamond storage
        assembly {
            ds.slot := position
        }
        // get facet from function selector
        address facet = address(bytes20(ds.facets[msg.sig]));
        require(facet != address(0), "Diamond: Function does not exist");
        // Execute external function from facet using delegatecall and return any value.
        assembly {
            // copy function selector and any arguments
            calldatacopy(0, 0, calldatasize())
            // execute function call using the facet
            let result := delegatecall(gas(), facet, 0, calldatasize(), 0, 0)
            // get any return value
            returndatacopy(0, 0, returndatasize())
            // return any return value or error back to the caller
            switch result
            case 0 {
                revert(0, returndatasize())
            }
            default {
                return(0, returndatasize())
            }
        }
    }

    /// @notice Rewards each worker winner by a constant amount set on deployment
    /// If current balance is insufficient to pay reward, then winner will
    /// be rewarded after balance is replenished
    receive() external payable {}
}

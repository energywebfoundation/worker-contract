// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/******************************************************************************\
* Author: Nick Mudge <nick@perfectabstractions.com> (https://twitter.com/mudgen)
* EIP-2535 Diamonds: https://eips.ethereum.org/EIPS/eip-2535
*
* Implementation of a diamond.
/******************************************************************************/

import {LibReward} from "./libraries/LibReward.sol";
import {LibVoting} from "./libraries/LibVoting.sol";
import {LibIssuer} from "./libraries/LibIssuer.sol";
import {LibDiamond} from "./libraries/LibDiamond.sol";
import {IDiamondCut} from "./interfaces/IDiamondCut.sol";
import {LibClaimManager} from "./libraries/LibClaimManager.sol";

contract Diamond {
    constructor(
        address _contractOwner,
        address _diamondCutFacet,
        uint256 _votingTimeLimit,
        uint256 _rewardAmount,
        address _claimManagerAddress,
        bytes32 issuerRole,
        bytes32 revokerRole,
        bytes32 validatorRole,
        bytes32 workerRole,
        uint256 revocablePeriod
    ) payable {
        require(_rewardAmount > 0, "Reward amount should be positive");
        require(_claimManagerAddress != address(0), "Invalid claimManager");
        require(revocablePeriod > 0, "Invalid revocable period");
        LibVoting.init(_votingTimeLimit);
        LibIssuer.init(revocablePeriod);
        LibReward.initRewards(_rewardAmount);
        LibDiamond.setContractOwner(_contractOwner);

        // Add the diamondCut external function from the diamondCutFacet
        IDiamondCut.FacetCut[] memory cut = new IDiamondCut.FacetCut[](1);
        bytes4[] memory functionSelectors = new bytes4[](1);
        functionSelectors[0] = IDiamondCut.diamondCut.selector;
        cut[0] = IDiamondCut.FacetCut({facetAddress: _diamondCutFacet, action: IDiamondCut.FacetCutAction.Add, functionSelectors: functionSelectors});
        LibDiamond.diamondCut(cut, address(0), "");

        //Set ClaimManager properties
        LibClaimManager.init(_claimManagerAddress, issuerRole, revokerRole, validatorRole, workerRole);
    }

    function updateClaimManager(address _newaddress) external returns (address oldAddress) {
        oldAddress = LibClaimManager.setClaimManagerAddress(_newaddress);
    }

    //TODO: provide unit tests for RoleVersion update
    function updateRoleVersion(bytes32 role, uint256 _newVersion) external returns (uint256 oldVersion) {
        oldVersion = LibClaimManager.setRoleVersion(role, _newVersion);
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
    receive() external payable {
        LibReward.RewardStorage storage rewardStorage = LibReward.getStorage();

        if (rewardStorage.rewardQueue.length > 0) {
            LibReward.payReward();
        }
    }
}

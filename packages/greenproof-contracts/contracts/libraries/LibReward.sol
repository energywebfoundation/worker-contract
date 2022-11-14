//SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import {OwnableStorage} from "@solidstate/contracts/access/ownable/Ownable.sol";

library LibReward {
    bytes32 constant REWARD_STORAGE_POSITION = keccak256("ewc.greenproof.rewardVoting.diamond.storage");

    /// Invalid call to pay rewards to the winners. Rewards are disabled.
    error RewardsDisabled();

    struct RewardStorage {
        bool rewardsEnabled;
        uint256 rewardAmount;
        address matchVotingAddress;
        address payable[] rewardQueue;
    }

    modifier onlyOwner() {
        require(OwnableStorage.layout().owner == msg.sender, "Greenproof: LibReward facet: Must be contract owner");
        _;
    }

    function initRewards(uint256 _rewardAmount, bool _rewardsEnabled) internal {
        RewardStorage storage rs = getStorage();

        rs.rewardAmount = _rewardAmount;
        rs.rewardsEnabled = _rewardsEnabled;
    }

    function setRewardsEnabled(bool rewardsEnabled) internal onlyOwner {
        RewardStorage storage rs = getStorage();

        if(rs.rewardsEnabled != rewardsEnabled) {
            rs.rewardsEnabled = rewardsEnabled;
        }
    }

    function payReward() internal {
        RewardStorage storage rs = getStorage();
        if(!rs.rewardsEnabled) {
            revert RewardsDisabled();
        }

        while (rs.rewardQueue.length > 0 && address(this).balance >= rs.rewardAmount) {
            address payable currentWorker = rs.rewardQueue[rs.rewardQueue.length - 1];
            rs.rewardQueue.pop();
            currentWorker.transfer(rs.rewardAmount);
        }
    }

    function getStorage() internal pure returns (RewardStorage storage rs) {
        bytes32 position = REWARD_STORAGE_POSITION;

        assembly {
            rs.slot := position
        }
    }
}

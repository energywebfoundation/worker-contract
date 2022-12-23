//SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import {OwnableStorage} from "@solidstate/contracts/access/ownable/Ownable.sol";

library LibReward {
    bytes32 constant REWARD_STORAGE_POSITION = keccak256("ewc.greenproof.rewardVoting.diamond.storage");

    /// Invalid call to pay rewards to the winners. Rewards are disabled.
    error RewardsDisabled();
    event RewardsActivated(uint256 indexed activationDate);
    event RewardsDeactivated(uint256 indexed deactivationDate);

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

    function _setRewardsFeature(bool isEnabled) internal onlyOwner {
        RewardStorage storage rs = getStorage();

        require(rs.rewardsEnabled != isEnabled, "LibReward: rewards state already set");
        rs.rewardsEnabled = isEnabled;
        if (isEnabled) {
            emit RewardsActivated(block.timestamp);
        } else {
            emit RewardsDeactivated(block.timestamp);
        }
    }

    function payReward() internal {
        RewardStorage storage rs = getStorage();

        uint256 rewardAmount = rs.rewardAmount;
        uint256 rewardQueueSize = rs.rewardQueue.length;

        while (rewardQueueSize > 0 && address(this).balance >= rewardAmount) {
            address payable currentWorker = rs.rewardQueue[rewardQueueSize - 1];
            rewardQueueSize--;
            rs.rewardQueue.pop();
            currentWorker.transfer(rs.rewardAmount);
        }
    }

    function _isRewardEnabled() internal view returns (bool) {
        return getStorage().rewardsEnabled;
    }

    function getStorage() internal pure returns (RewardStorage storage rs) {
        bytes32 position = REWARD_STORAGE_POSITION;

        assembly {
            rs.slot := position
        }
    }
}

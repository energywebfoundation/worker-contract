//SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import {OwnableStorage} from "@solidstate/contracts/access/ownable/Ownable.sol";

library LibReward {
    bytes32 private constant REWARD_STORAGE_POSITION = keccak256("ewc.greenproof.rewardVoting.diamond.storage");

    /// Invalid call to pay rewards to the winners. Rewards are disabled.
    error RewardsDisabled();
    event RewardsActivated(uint256 indexed activationDate);
    event RewardsDeactivated(uint256 indexed deactivationDate);
    event RewardsPayed(uint256 indexed numberOfRewards);

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

    function _payReward(uint256 maxNumberOfPays) internal {
        RewardStorage storage rs = getStorage();

        uint256 rewardAmount = rs.rewardAmount;
        uint256 numberOfPays = rs.rewardQueue.length;
        if (numberOfPays > maxNumberOfPays) {
            numberOfPays = maxNumberOfPays;
        }
        if (numberOfPays > address(this).balance / rewardAmount) {
            numberOfPays = address(this).balance / rewardAmount;
        }

        for (uint256 i = 0; i < numberOfPays; i++) {
            address payable currentWorker = rs.rewardQueue[rs.rewardQueue.length - 1];
            rs.rewardQueue.pop();
            /// @dev `transfer` is safe, because worker is EOA
            currentWorker.transfer(rs.rewardAmount);
        }

        emit RewardsPayed(numberOfPays);
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

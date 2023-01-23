//SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import {OwnableStorage} from "@solidstate/contracts/access/ownable/Ownable.sol";
import {LibClaimManager} from "./LibClaimManager.sol";

library LibReward {
    struct RewardStorage {
        bool rewardsEnabled;
        uint256 rewardAmount;
        address payable[] rewardQueue;
    }

    bytes32 private constant REWARD_STORAGE_POSITION = keccak256("ewc.greenproof.rewardVoting.diamond.storage");

    error RewardsDisabled(); // Invalid call to pay rewards to the winners. Rewards are disabled.
    error NoFundsProvided(); // No funds sent in msg.value
    error RewardStateNotChanged(bool state); // The rewarding toggle is in the same state as previous

    modifier onlyOwner() {
        LibClaimManager.checkOwnership();
        _;
    }

    function initRewards(uint256 _rewardAmount, bool _rewardsEnabled) internal {
        RewardStorage storage rs = getStorage();

        rs.rewardAmount = _rewardAmount;
        rs.rewardsEnabled = _rewardsEnabled;
    }

    function _setRewardsFeature(bool isEnabled) internal onlyOwner {
        RewardStorage storage rs = getStorage();
        if (rs.rewardsEnabled == isEnabled) {
            revert RewardStateNotChanged(isEnabled);
        }
        rs.rewardsEnabled = isEnabled;
    }

    function _payReward(uint256 maxNumberOfPays) internal returns (uint256 rewardedAmount) {
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
            currentWorker.transfer(rewardAmount);
        }
        rewardedAmount = numberOfPays;
    }

    function isRewardEnabled() internal view returns (bool) {
        return getStorage().rewardsEnabled;
    }

    function checkRewardEnabled() internal view {
        if (!isRewardEnabled()) {
            revert RewardsDisabled();
        }
    }

    function checkFunds() internal view {
        if (msg.value == 0) {
            revert NoFundsProvided();
        }
    }

    function getStorage() internal pure returns (RewardStorage storage rs) {
        bytes32 position = REWARD_STORAGE_POSITION;

        assembly {
            rs.slot := position
        }
    }
}

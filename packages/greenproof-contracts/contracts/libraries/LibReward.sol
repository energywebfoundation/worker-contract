//SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

library LibReward {
    bytes32 constant REWARD_STORAGE_POSITION = keccak256("ewc.greenproof.rewardVoting.diamond.storage");
    struct RewardStorage {
        uint256 rewardAmount;
        address matchVotingAddress;
        address payable[] rewardQueue;
    }

    function initRewards(uint256 _rewardAmount) internal {
        RewardStorage storage rs = getStorage();

        rs.rewardAmount = _rewardAmount;
    }

    function payReward() internal {
        RewardStorage storage rs = getStorage();

        while (rs.rewardQueue.length > 0 && address(this).balance > rs.rewardAmount) {
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

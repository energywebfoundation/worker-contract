//SPDX-License-Identifier: MIT
pragma solidity ^0.8.8;

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
            rs.rewardQueue[rs.rewardQueue.length - 1].transfer(rs.rewardAmount);
            rs.rewardQueue.pop();
        }
    }

    function reward(address payable[] memory winners) internal {
        RewardStorage storage rs = getStorage();

        for (uint256 i = 0; i < winners.length; i++) {
            rs.rewardQueue.push(winners[i]);
        }
        payReward();
    }

    function getStorage() internal view returns (RewardStorage storage rs) {
        bytes32 position = REWARD_STORAGE_POSITION;

        assembly {
            rs.slot := position
        }
    }
}

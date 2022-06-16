//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

interface IRewardVoting {
    function reward(address payable[] memory winners) external;
}

/// @notice Rewards each winner by constant amount set on deployment
/// If current balance is insufficient to pay reward, then winner will
/// be rewarded after balance is replenished
contract RewardFixed is Ownable, IRewardVoting {
    uint256 rewardAmount;
    address payable[] rewardQueue;
    address matchVotingAddress;

    modifier isVoting() {
        require(
            msg.sender == matchVotingAddress,
            "Only match voting contract allowed"
        );
        _;
    }

    constructor(uint256 _rewardAmount) {
        require(_rewardAmount > 0, "Reward amount should be positive");
        rewardAmount = _rewardAmount;
    }

    function setMatchVoting(address _matchVotingAddress) public onlyOwner {
        matchVotingAddress = _matchVotingAddress;
    }

    function reward(address payable[] memory winners)
        external
        override
        isVoting
    {
        for (uint256 i = 0; i < winners.length; i++) {
            rewardQueue.push(winners[i]);
        }
        payReward();
    }

    function payReward() internal {
        while (rewardQueue.length > 0 && address(this).balance > rewardAmount) {
            rewardQueue[rewardQueue.length - 1].transfer(rewardAmount);
            rewardQueue.pop();
        }
    }

    receive() external payable {
        if (rewardQueue.length > 0) {
            payReward();
        }
    }
}

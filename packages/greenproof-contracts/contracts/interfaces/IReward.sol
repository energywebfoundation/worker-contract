//SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

interface IReward {
    error NoFundsProvided();

    event RewardsFunded(uint256 indexed amount);

    function sendWorkersRewards() external payable;
}

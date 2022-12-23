//SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

interface IReward {
    error NoFundsProvided();

    event Replenished(uint256 indexed amount);
    event RewardsActivated(uint256 indexed activationDate);
    event RewardsDeactivated(uint256 indexed deactivationDate);

    function replenishRewardPool() external payable;
}

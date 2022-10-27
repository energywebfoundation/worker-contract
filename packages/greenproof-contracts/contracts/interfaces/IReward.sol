//SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

interface IReward {
    error NoFundsProvided();

    event Replenished(uint256 indexed amount);

    function replenishRewardPool() external payable;
}

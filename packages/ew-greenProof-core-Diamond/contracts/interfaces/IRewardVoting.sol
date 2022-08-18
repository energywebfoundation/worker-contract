//SPDX-License-Identifier: MIT
pragma solidity ^0.8.8;

interface IRewardVoting {
    function reward(address payable[] memory winners) external;
}

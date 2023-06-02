// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

contract TestRevertOnReceive {
    fallback() external payable {
        revert("I don't accept Ether");
    }
}

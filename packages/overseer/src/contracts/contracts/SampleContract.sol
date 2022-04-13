//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

contract SampleContract {

    event InterestingEvent(string message, uint32 value);
    event CuriousEvent(string message, uint32 value);
    event DullEvent(string message, uint32 value);

    constructor() {
        
    }

    function interestingFunction() public returns (string memory) {
        emit InterestingEvent("InterestingFunction called", 42);
        emit CuriousEvent("CuriousEvent called", 1);
        return "interesting";
    }

    function dullFunction() public returns (string memory) {
        emit DullEvent("DullEvent called", 0);
        return "dull";
    }
}

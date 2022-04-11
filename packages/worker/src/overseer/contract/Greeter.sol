//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";

contract Greeter {
    string private greeting;

    event Greeting(string greeting);
    event Dupa(string dupa);

    constructor() {
        greeting = "hello mothafucka";
    }

    function greet() public returns (string memory) {
        emit Greeting("greet called");
        return greeting;
    }

    function dupa() public returns (string memory) {
        emit Dupa("dupa called");
        return "dupa";
    }

    function setGreeting(string memory _greeting) public {
        greeting = _greeting;
    }
}

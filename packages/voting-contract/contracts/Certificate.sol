pragma solidity ^0.8.0;

interface ICertificate {
    function mint(string memory matchInput, string memory matchResult) external;
}

contract Certificate {
    mapping(string => string) public matches;

    function mint(string memory matchInput, string memory matchResult) external {
        matches[matchInput] = matchResult;
    }
}

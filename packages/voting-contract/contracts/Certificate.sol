pragma solidity ^0.8.0;

interface ICertificate {
    function mint(string memory matchResult) external;
}

contract Certificate {
    string[] public matchResults;

    function mint(string memory matchResult) external {
        matchResults.push(matchResult);
    }
}

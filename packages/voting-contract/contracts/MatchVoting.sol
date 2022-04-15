//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/access/Ownable.sol";

import "hardhat/console.sol";

contract MatchVoting is Ownable {
    address public votingManager;
    string[] public matches;
    mapping(address => string) public workerToVote;
    mapping(string => uint) public matchResultToVoteCount;

    constructor(address[] memory workers) {
        votingManager = msg.sender;

        for (uint i = 0; i < workers.length; i++) {
            workerToVote[workers[i]] = "NOT VOTED";
        }
    }

    function vote(string memory matchResult) external {
        require(keccak256(abi.encode(workerToVote[msg.sender])) == keccak256(abi.encode("NOT VOTED")), "Already voted or not whitelisted");

        workerToVote[msg.sender] = matchResult;

        if(matchResultToVoteCount[matchResult] == 0) {
            matches.push(matchResult);
        }

        matchResultToVoteCount[matchResult] += 1;
    }

    function getWinner() external view onlyOwner returns (string memory winningMatch) {
        uint winningVoteCount = 0;

        for (uint i = 0; i < matches.length; i++) {
            if (matchResultToVoteCount[matches[i]] > winningVoteCount) {
                winningVoteCount = matchResultToVoteCount[matches[i]];
                winningMatch = matches[i];
            }
        }

        return winningMatch;
    }
}

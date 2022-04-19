//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

import "hardhat/console.sol";

contract MatchVoting is Ownable {
    /// Match timestamp
    uint public timestamp;

    /// Disables voting option after voting end
    bool public votingEnded;

    /// List of all match results with at least one vote
    string[] public matches;

    /// Worker address to match result
    mapping(address => string) public workerToMatchResult;

    /// Match result to total vote count
    mapping(string => uint) public matchResultToVoteCount;

    /// Event emitted after voting ended
    event WinningMatch(string matchResult, uint timestamp, uint voteCount);

    /// Worker had already voted for a match result or is not whitelisted
    error AlreadyVotedOrNotWhitelisted();

    /// Voting ended, winner is chosen - workers cannot vote anymore
    error VotingAlreadyEnded();

    /// No votes registered
    error NoVotesYet();

    constructor(address[] memory workers, uint _timestamp) {
        timestamp = _timestamp;

        for (uint i = 0; i < workers.length; i++) {
            workerToMatchResult[workers[i]] = "NOT VOTED";
        }
    }

    function vote(string memory matchResult) external {
        if (votingEnded) {
            revert VotingAlreadyEnded();
        }

        if (keccak256(abi.encode(workerToMatchResult[msg.sender])) != keccak256(abi.encode("NOT VOTED"))) {
            revert AlreadyVotedOrNotWhitelisted();
        }

        workerToMatchResult[msg.sender] = matchResult;

        if (matchResultToVoteCount[matchResult] == 0) {
            matches.push(matchResult);
        }

        matchResultToVoteCount[matchResult] += 1;
    }

    function getWinningMatch() external onlyOwner returns (bool success) {
        if (matches.length == 0) {
            revert NoVotesYet();
        }

        uint winningVoteCount = 0;

        for (uint i = 0; i < matches.length; i++) {
            if (matchResultToVoteCount[matches[i]] > winningVoteCount) {
                winningVoteCount = matchResultToVoteCount[matches[i]];
                winningMatch = matches[i];
            }
        }

        votingEnded = true;
        emit WinningMatch(winningMatch, timestamp, winningVoteCount);

        return true;
    }
}

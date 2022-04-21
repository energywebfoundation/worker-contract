//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

import "hardhat/console.sol";
import "./Certificate.sol";

contract MatchVoting is Ownable {
    /// Match timestamp
    uint public timestamp;

    /// Number of participating workers
    uint public workersCount;

    /// Disables voting option after voting end
    bool public votingEnded;

    /// Winning match result
    string public winningMatch;

    /// Winning match result
    address public certificateContractAddress;

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

    /// Winning match result did not reach more than a half of total votes
    error NoConsensusReached();

    /// No votes registered
    error NoVotesYet();

    constructor(address[] memory workers, uint _timestamp, address _certificateContractAddress) {
        timestamp = _timestamp;
        certificateContractAddress = _certificateContractAddress;
        workersCount = workers.length;

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

        uint winningVoteCount;

        for (uint i = 0; i < matches.length; i++) {
            if (matchResultToVoteCount[matches[i]] > winningVoteCount) {
                winningVoteCount = matchResultToVoteCount[matches[i]];
                winningMatch = matches[i];
            }
        }

        if(10 * winningVoteCount < 10 * workersCount / 2 ) {
            revert NoConsensusReached();
        }

        votingEnded = true;

        // To be changed to real certificate issuance
        ICertificate(certificateContractAddress).mint(winningMatch);

        emit WinningMatch(winningMatch, timestamp, winningVoteCount);

        return true;
    }
}

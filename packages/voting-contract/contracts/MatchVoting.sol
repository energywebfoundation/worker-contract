//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

import "hardhat/console.sol";
import "./Certificate.sol";

contract MatchVoting is Ownable {
    /// Certificate minting contract address
    address public certificateContractAddress;

    address[] public workers;

    uint public numberOfWorkers;

    mapping(address => uint) public workerToIndex;

    struct Voting {
        /// List of all match results with at least one vote
        string[] matches;

        /// Worker address to match result
        mapping(address => string) workerToMatchResult;

        /// Match result to total vote count
        mapping(string => uint) matchResultToVoteCount;

        /// Disables voting option after voting end
        bool ended;

        /// Disables enrollment of new workers after voting started
        bool started;

        /// Winning match result
        string winningMatch;
    }

    /// Worker address to match result
    mapping(string => Voting) public matchInputToVoting;

    /// Event emitted after voting ended
    event WinningMatch(string matchInput, string matchResult, uint voteCount);

    /// Worker had already voted for a match result or is not whitelisted
    error AlreadyVotedOrNotWhitelisted();

    /// Voting ended, winner is chosen - workers cannot vote anymore
    error VotingAlreadyEnded();

    /// Winning match result did not reach more than a half of total votes
    error NoConsensusReached();

    /// No votes registered
    error NoVotesYet();

    constructor(address _certificateContractAddress) {
        certificateContractAddress = _certificateContractAddress;
    }

    function vote(string memory matchInput, string memory matchResult) external {
        Voting storage voting = matchInputToVoting[matchInput];

        if (voting.ended) {
            revert VotingAlreadyEnded();
        }

        if (!voting.started) {
            for (uint i = 0; i < workers.length; i++) {
                voting.workerToMatchResult[workers[i]] = "NOT VOTED";
            }
            voting.started = true;
        }

        if (keccak256(abi.encode(voting.workerToMatchResult[msg.sender])) != keccak256(abi.encode("NOT VOTED"))) {
            revert AlreadyVotedOrNotWhitelisted();
        }

        voting.workerToMatchResult[msg.sender] = matchResult;

        if (voting.matchResultToVoteCount[matchResult] == 0) {
            voting.matches.push(matchResult);
        }

        voting.matchResultToVoteCount[matchResult] += 1;
    }

    function getWinningMatch(string memory matchInput) external onlyOwner returns (bool success) {
        Voting storage voting = matchInputToVoting[matchInput];

        if (voting.matches.length == 0) {
            revert NoVotesYet();
        }

        uint winningVoteCount;

        for (uint i = 0; i < voting.matches.length; i++) {
            if (voting.matchResultToVoteCount[voting.matches[i]] > winningVoteCount) {
                winningVoteCount = voting.matchResultToVoteCount[voting.matches[i]];
                voting.winningMatch = voting.matches[i];
            }
        }

        if (10 * winningVoteCount < 10 * workers.length / 2) {
            revert NoConsensusReached();
        }

        voting.ended = true;

        // To be changed to real certificate issuance
        // ICertificate(certificateContractAddress).mint(matchInput, voting.winningMatch);

        emit WinningMatch(matchInput, voting.winningMatch, winningVoteCount);

        return true;
    }

    function addWorker(address workerAddress) external onlyOwner {
        workerToIndex[workerAddress] = workers.length;
        workers.push(workerAddress);
        numberOfWorkers = workers.length;
    }

    function removeWorker(address workerAddress) external onlyOwner {
        uint workerIndex = workerToIndex[workerAddress];
        // Delete the worker
        delete workers[workerIndex];
        // Copy last element to fill the missing place in array
        workers[workerIndex] = workers[workers.length - 1];
        // Delete last element
        delete workers[workers.length - 1];
        numberOfWorkers = numberOfWorkers - 1;
    }

    function getWorkerVote(string memory matchInput, address workerAddress) external view onlyOwner returns (string memory matchResult) {
        return matchInputToVoting[matchInput].workerToMatchResult[workerAddress];
    }
}

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

    string[] public matchInputs;

    uint public numberOfMatchInputs;

    struct Voting {
        /// List of all match results with at least one vote
        string[] matches;

        /// Worker address to match result
        mapping(address => string) workerToMatchResult;

        /// Worker address to voted flag
        mapping(address => bool) workerToVoted;

        /// Match result to total vote count
        mapping(string => uint) matchResultToVoteCount;

        /// Disables voting option after voting end
        bool ended;

        /// Winning match result
        string winningMatch;
    }

    /// Worker address to match result
    mapping(string => Voting) public matchInputToVoting;

    /// Event emitted after voting ended
    event WinningMatch(string matchInput, string matchResult, uint voteCount);

    /// Worker had already voted for a match result
    error AlreadyVoted();

    /// Sender is not whitelisted
    error NotWhitelisted();

    /// Voting ended, winner is chosen - workers cannot vote anymore
    error VotingAlreadyEnded();

    /// Winning match result did not reach more than a half of total votes
    error NoConsensusReached();

    constructor(address _certificateContractAddress) {
        certificateContractAddress = _certificateContractAddress;
    }

    function vote(string memory matchInput, string memory matchResult) external {
        Voting storage voting = matchInputToVoting[matchInput];

        if (voting.ended) {
            revert VotingAlreadyEnded();
        }

        bool isWhiteListed;
        for (uint i = 0; i < workers.length; i++) {
            if (workers[i] == msg.sender) {
                isWhiteListed = true;
            }
        }
        if (!isWhiteListed) {
            revert NotWhitelisted();
        }

        if (voting.workerToVoted[msg.sender]) {
            revert AlreadyVoted();
        }

        voting.workerToMatchResult[msg.sender] = matchResult;
        voting.workerToVoted[msg.sender] = true;

        if (voting.matchResultToVoteCount[matchResult] == 0) {
            voting.matches.push(matchResult);
        }

        voting.matchResultToVoteCount[matchResult] += 1;

        uint numberOfVotes;
        for (uint i = 0; i < workers.length; i++) {
            if (voting.workerToVoted[workers[i]]) {
                numberOfVotes += 1;
            }
        }

        if (numberOfVotes == 1) {
            matchInputs.push(matchInput);
            numberOfMatchInputs += 1;
        }

        if (10 * numberOfVotes > 10 * workers.length / 2) {
            getWinningMatch(matchInput);
        }
    }

    function getWinningMatch(string memory matchInput) private returns (bool success) {
        Voting storage voting = matchInputToVoting[matchInput];

        uint winningVoteCount;

        for (uint i = 0; i < voting.matches.length; i++) {
            if (voting.matchResultToVoteCount[voting.matches[i]] > winningVoteCount) {
                winningVoteCount = voting.matchResultToVoteCount[voting.matches[i]];
                voting.winningMatch = voting.matches[i];
            }
        }

        if (10 * winningVoteCount < 10 * workers.length / 2) {
            return false;
        }

        voting.ended = true;

        if (certificateContractAddress != address(0)) {
            ICertificate(certificateContractAddress).mint(matchInput, voting.winningMatch);
        }

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

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.8;

import {LibReward} from "../libraries/LibReward.sol";
import {LibVoting} from "../libraries/LibVoting.sol";
import {LibDiamond} from "../libraries/LibDiamond.sol";
import {IVoting} from "../interfaces/IVoting.sol";

contract VotingFacet is IVoting {
    /**
        Allowing library's function calls on address type
        This improves code reading by writing address.isWorker() and address.isNotWorker()
        Instead of LibVoting.isWorker(address) and LibVoting.isNotWorker(address)
    */
    using LibVoting for address;

    /**
        Allowing library's function calls on Voting struct type. 
        This improves code reading by writing voting.isExpired() or voting.cancelVoting()
        Instead of LibVoting.isExpired(voting) or LibVoting.cancelVoting(voting) respectively
    */
    using LibVoting for LibVoting.Voting;

    /// @notice Increases number of votes given for matchResult. Winner is determined by simple majority
    /// When consensus is not reached the voting is restarted
    function vote(
        string memory matchInput,
        string memory matchResult,
        bool isSettlement
    ) external {
        LibVoting.VotingStorage storage votingStorage = LibVoting.getStorage();

        if ((msg.sender.isNotWorker())) {
            revert LibVoting.NotWhitelisted();
        }
        LibVoting.Voting storage voting = votingStorage.matchInputToVoting[matchInput];
        if (voting.status == LibVoting.Status.Active && (voting.isExpired())) {
            voting.cancelVoting();
            emit LibVoting.VotingExpired(matchInput);
        }
        if (voting.status == LibVoting.Status.Completed) {
            revert LibVoting.VotingAlreadyEnded();
        }

        if (voting.status == LibVoting.Status.NotActive) {
            LibVoting.startVoting(matchInput, isSettlement);
        }

        if (voting.workerToVoted[msg.sender]) {
            revert LibVoting.AlreadyVoted();
        }

        voting.workerToMatchResult[msg.sender] = matchResult;
        voting.workerToVoted[msg.sender] = true;
        voting.numberOfVotes += 1;

        if (voting.matchResultToVoteCount[matchResult] == 0) {
            voting.matches.push(matchResult);
        }

        voting.matchResultToVoteCount[matchResult] += 1;

        if (voting.matchResultToVoteCount[matchResult] == voting.winningMatchVoteCount) {
            voting.noConsensus = true;
        } else if (voting.matchResultToVoteCount[matchResult] > voting.winningMatchVoteCount) {
            voting.winningMatchVoteCount = voting.matchResultToVoteCount[matchResult];
            voting.winningMatch = matchResult;
            voting.noConsensus = false;

            if (voting.winningMatchVoteCount >= LibVoting.majority()) {
                voting.completeVoting();
            }
        }

        if (voting.numberOfVotes == votingStorage.numberOfWorkers) {
            voting.completeVoting();
        }
    }

    function getWinners(string memory matchInput) external view returns (address payable[] memory _winners) {
        _winners = LibVoting._getWinners(matchInput);
    }

    function getWinningMatch(string memory matchInput) external view returns (string memory) {
        LibVoting.VotingStorage storage votingStorage = LibVoting.getStorage();
        return votingStorage.matchInputToVoting[matchInput].winningMatch;
    }

    function getWorkerVote(string memory matchInput, address workerAddress) external view returns (string memory matchResult) {
        LibVoting.VotingStorage storage votingStorage = LibVoting.getStorage();

        return votingStorage.matchInputToVoting[matchInput].workerToMatchResult[workerAddress];
    }

    function numberOfMatchInputs() external view returns (uint256) {
        LibVoting.VotingStorage storage votingStorage = LibVoting.getStorage();

        return votingStorage.matchInputs.length;
    }

    function addWorker(address payable workerAddress) external {
        //AccessControl
        LibDiamond.enforceIsContractOwner();
        LibVoting.VotingStorage storage votingStorage = LibVoting.getStorage();

        if (address(workerAddress).isWorker()) {
            revert LibVoting.WorkerAlreadyAdded();
        }
        votingStorage.workerToIndex[workerAddress] = votingStorage.numberOfWorkers;
        votingStorage.workers.push(workerAddress);
        votingStorage.numberOfWorkers = votingStorage.numberOfWorkers + 1;
    }

    function getMatch(string memory input) external view returns (string memory) {
        LibVoting.VotingStorage storage votingStorage = LibVoting.getStorage();

        return votingStorage.matches[input];
    }

    function reward(address payable[] memory winners) external {
        LibReward.RewardStorage storage rs = LibReward.getStorage();

        for (uint256 i = 0; i < winners.length; i++) {
            rs.rewardQueue.push(winners[i]);
        }
        LibReward.payReward();
    }

    function isWorker(address addressToCheck) external view returns (bool) {
        return LibVoting.isWorker(addressToCheck);
    }

    /// @notice Cancels votings that takes longer than time limit
    function cancelExpiredVotings() external {
        //AccessControl
        LibDiamond.enforceIsContractOwner();
        LibVoting.VotingStorage storage votingStorage = LibVoting.getStorage();

        for (uint256 i = 0; i < votingStorage.matchInputs.length; i++) {
            LibVoting.Voting storage voting = votingStorage.matchInputToVoting[votingStorage.matchInputs[i]];
            if (voting.status == LibVoting.Status.Active && voting.isExpired()) {
                emit LibVoting.VotingExpired(votingStorage.matchInputs[i]);
                voting.cancelVoting();
            }
        }
    }
}
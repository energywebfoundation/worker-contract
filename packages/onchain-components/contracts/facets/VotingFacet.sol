// SPDX-License-Identifier: MIT
pragma solidity ^0.8.8;

import {LibVoting} from "../libraries/LibVoting.sol";
import {Ownable} from "@solidstate/contracts/access/ownable/Ownable.sol";

contract MatchVoting is Ownable {
    /** getStorage: returns a pointer to the storage  */
    function getStorage() internal pure returns (LibVoting.VotingStorage storage _votingStorage) {
        _votingStorage = LibVoting._getStorage();
    }

    /// @notice Increases number of votes given for matchResult. Winner is determined by simple majority
    /// When consensus is not reached the voting is restarted
    function vote(string memory matchInput, string memory matchResult) external {
        LibVoting.VotingStorage storage votingStorage = getStorage();

        if (!isWorker(msg.sender)) {
            revert LibVoting.NotWhitelisted();
        }
        LibVoting.Voting storage voting = votingStorage.matchInputToVoting[matchInput];
        if (voting.status == LibVoting.Status.Active && LibVoting.isExpired(voting)) {
            LibVoting.cancelVoting(voting);
            emit LibVoting.VotingExpired(matchInput);
        }
        if (voting.status == LibVoting.Status.Completed) {
            revert LibVoting.VotingAlreadyEnded();
        }

        if (voting.status == LibVoting.Status.NotActive) {
            LibVoting.startVoting(matchInput);
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

            if (voting.winningMatchVoteCount >= majority()) {
                LibVoting.completeVoting(voting);
            }
        }

        if (voting.numberOfVotes == votingStorage.numberOfWorkers) {
            LibVoting.completeVoting(voting);
        }
    }

    /// @notice Check if this account allowed to vote
    function isWorker(address workerAddress) internal view returns (bool) {
        LibVoting.VotingStorage storage votingStorage = getStorage();
        return votingStorage.workerToIndex[workerAddress] != 0 || (votingStorage.numberOfWorkers > 0 && votingStorage.workers[0] == workerAddress);
    }

    /// @notice Number of votes sufficient to determine match winner
    function majority() internal view returns (uint256) {
        LibVoting.VotingStorage storage votingStorage = getStorage();

        return (votingStorage.numberOfWorkers / 2) + 1;
    }

    function getWinners(string memory matchInput) external view returns (address payable[] memory _winners) {        
        _winners = LibVoting._getWinners(matchInput);
    }
}

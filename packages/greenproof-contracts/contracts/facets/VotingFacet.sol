// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import {OwnableStorage} from "@solidstate/contracts/access/ownable/Ownable.sol";
import {IVoting} from "../interfaces/IVoting.sol";
import {IReward} from "../interfaces/IReward.sol";
import {LibIssuer} from "../libraries/LibIssuer.sol";
import {LibReward} from "../libraries/LibReward.sol";
import {LibVoting} from "../libraries/LibVoting.sol";
import {LibClaimManager} from "../libraries/LibClaimManager.sol";

/**
 * @title `Votingfacet` - The voting component of the GreenProof core module.
 * @author Energyweb Foundation
 * @notice this facet handles all voting functionalities of the greenProof-core module
 * @dev This contract is a facet of the EW-GreenProof-Core Diamond, a gas optimized implementation of EIP-2535 Diamond proxy standard : https://eips.ethereum.org/EIPS/eip-2535
 */
contract VotingFacet is IVoting, IReward {
    /**
     * @notice Allowing direct calls on LibVoting's functions for address type.
     * @dev This improves code readability by writing `address.isWorker()` and `address.isNotWorker()`
     * Instead of LibVoting.isWorker(address) and LibVoting.isNotWorker(address)
     */
    using LibVoting for address;
    using LibClaimManager for address;

    /**
     * @notice Allowing direct calls on LibVoting's functions for Voting type.
     * @dev This improves code readability by writing voting.isExpired() or voting.cancelVoting()
     * Instead of LibVoting.isExpired(voting) or LibVoting.cancelVoting(voting) respectively
     */
    using LibVoting for LibVoting.Voting;

    modifier onlyEnrolledWorkers(address operator) {
        require(operator.isEnrolledWorker(), "Access denied: not enrolled as worker");
        _;
    }

    modifier onlyOwner() {
        require(OwnableStorage.layout().owner == msg.sender, "Greenproof: Voting facet: Only owner allowed");
        _;
    }

    /**
     * @notice `vote` - Each worker votes for a given matchResult, increasing the number of votes for this matchResult.
     * @param voteID - The identifier of the vote
     * @param matchResult - The actual vote of the worker
     * @dev The winning vote is determined by simple majority. When consensus is not reached the voting is restarted.
     */
    function vote(bytes32 voteID, bytes32 matchResult) external override {
        if ((msg.sender.isNotWorker())) {
            revert LibVoting.NotWhitelisted();
        }

        LibVoting.Voting storage voting = LibVoting._getVote(voteID);
        LibVoting.VotingStorage storage votingStorage = LibVoting.getStorage();

        if (voting._isExpired()) {
            voting._resetVotingSession();
        }

        if (voting._isClosed() || msg.sender._hasAlreadyVoted(voting)) {
            // we prevent wasting computation if the vote is the same as the previous one
            if (votingStorage.workerVotes[msg.sender][voteID] == matchResult) {
                return;
            }

            (bool shouldUpdateVote, bytes32 newWinningMatch, uint256 newVoteCount) = voting._replayVote(matchResult);

            if (shouldUpdateVote) {
                //We update the voting results
                voting._updateWorkersVote();
                (bool differentWinningMatch) = voting._updateVoteResult(newWinningMatch, newVoteCount);
                voting._revealWinners();

                if(differentWinningMatch) {
                    emit WinningMatch(voteID, newWinningMatch, newVoteCount);
                }

                LibVoting._reward(votingStorage.winnersList[voteID]);
            }
        } else {
            if (voting._hasNotStarted()) {
                LibVoting._startVotingSession(voteID);
            }

            voting._recordVote(matchResult);
        }
    }

    /**
     * @notice addWorker - Adds a worker to the whiteList of authorized workers.
     * To be added, a worker should have the `workerRole` credential inside the claimManager
     * @param workerAddress - The address of the worker we want to remove
     * @dev only the address referenced as the contract owner is allowed to perform this.
     */
    function addWorker(address payable workerAddress) external override onlyEnrolledWorkers(workerAddress) {
        LibVoting.VotingStorage storage votingStorage = LibVoting.getStorage();

        if (address(workerAddress).isWorker()) {
            revert LibVoting.WorkerAlreadyAdded();
        }
        votingStorage.workerToIndex[workerAddress] = votingStorage.numberOfWorkers;
        votingStorage.workers.push(workerAddress);
        votingStorage.numberOfWorkers = votingStorage.numberOfWorkers + 1;
    }

    /**
     * @notice removeWorker - Removes a worker from the whiteList of authorized workers
     * The `workerRole` credential of the worker should be revoked before the removal.
     * @param workerToRemove - The address of the worker we want to remove
     * @dev only the address referenced as the contract owner is allowed to perform this
     */
    function removeWorker(address workerToRemove) external override {
        LibVoting.VotingStorage storage votingStorage = LibVoting.getStorage();

        if (workerToRemove.isNotWorker()) {
            revert LibVoting.WorkerWasNotAdded(workerToRemove);
        }
        require(workerToRemove.isEnrolledWorker() == false, "Not allowed: still enrolled as worker");

        if (votingStorage.numberOfWorkers > 1) {
            uint256 workerIndex = votingStorage.workerToIndex[workerToRemove];
            // Copy last element to fill the missing place in array
            address payable workerToMove = votingStorage.workers[votingStorage.numberOfWorkers - 1];
            votingStorage.workers[workerIndex] = workerToMove;
            votingStorage.workerToIndex[workerToMove] = workerIndex;
        }

        delete votingStorage.workerToIndex[workerToRemove];
        votingStorage.workers.pop();
        votingStorage.numberOfWorkers = votingStorage.numberOfWorkers - 1;
    }

    /**
     * @notice Cancels votings that takes longer than time limit
     */
    function cancelExpiredVotings() external override onlyOwner {
        LibVoting.VotingStorage storage votingStorage = LibVoting.getStorage();

        for (uint256 i = 0; i < votingStorage.voteIDs.length; i++) {
            LibVoting.Voting storage voting = votingStorage.voteIDToVoting[votingStorage.voteIDs[i]];

            if (voting._isExpired()) {
                voting._resetVotingSession();
            }
        }
    }

    function getMatch(bytes32 input) external view returns (bytes32) {
        LibVoting.VotingStorage storage votingStorage = LibVoting.getStorage();

        return votingStorage.matches[input];
    }

    function isWorker(address addressToCheck) external view returns (bool) {
        return LibVoting.isWorker(addressToCheck);
    }

    function getNumberOfWorkers() external view override returns (uint256) {
        LibVoting.VotingStorage storage votingStorage = LibVoting.getStorage();

        return votingStorage.numberOfWorkers;
    }

    function getWorkers() external view override returns (address payable[] memory) {
        LibVoting.VotingStorage storage votingStorage = LibVoting.getStorage();

        return votingStorage.workers;
    }

    /**
     * @notice getWinners - a getter function to retreieve the list of workers who voted for the winning macth
     * @param voteID - The identifier of the vote
     * @return winnersList - the List of worker's addresses
     */
    function getWinners(bytes32 voteID) external view override returns (address payable[] memory) {
        LibVoting.VotingStorage storage votingStorage = LibVoting.getStorage();

        return votingStorage.winnersList[voteID];
    }

    function getWinningMatch(bytes32 voteID) external view override returns (bytes32) {
        LibVoting.VotingStorage storage votingStorage = LibVoting.getStorage();

        return votingStorage.winningMatches[voteID];
    }

    function getWorkerVote(bytes32 voteID, address workerAddress) external view override returns (bytes32 matchResult) {
        LibVoting.VotingStorage storage votingStorage = LibVoting.getStorage();

        return votingStorage.workerVotes[workerAddress][voteID];
    }

    function numberOfvotingSessions() external view override returns (uint256) {
        LibVoting.VotingStorage storage votingStorage = LibVoting.getStorage();

        return votingStorage.voteIDs.length;
    }

    function replenishRewardPool() external payable override {
        LibReward.RewardStorage storage rewardStorage = LibReward.getStorage();

        if (msg.value == 0) {
            revert NoFundsProvided();
        }

        emit Replenished(msg.value);

        if (rewardStorage.rewardQueue.length > 0) {
            LibReward.payReward();
        }
    }
}

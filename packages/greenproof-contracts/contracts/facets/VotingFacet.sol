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
    using LibClaimManager for address;

    modifier onlyEnrolledWorkers(address operator) {
        require(operator.isEnrolledWorker(), "Access denied: not enrolled as worker");
        _;
    }

    modifier onlyOwner() {
        require(OwnableStorage.layout().owner == msg.sender, "Greenproof: Voting facet: Only owner allowed");
        _;
    }

    modifier onlyWhitelistedWorker() {
        if (!isWhitelistedWorker(msg.sender)) {
            revert LibVoting.NotWhitelisted();
        }
        _;
    }

    modifier onlyWhenEnabledRewards() {
        if (!LibReward._isRewardEnabled()) {
            revert LibReward.RewardsDisabled();
        }
        _;
    }

    /**
     * @notice Increases the number of votes for this matchResult. Voting completes when that vote leads to consensus or when voting expires
     */
    function vote(bytes32 votingID, bytes32 matchResult) external override onlyWhitelistedWorker {
        bytes32 sessionID = LibVoting._getSessionID(votingID, matchResult);
        LibVoting.VotingSession storage session = LibVoting._getSession(votingID, sessionID);

        if (LibVoting._isClosed(session)) {
            revert LibVoting.SessionCannotBeRestarted(votingID, matchResult);
        }

        if (LibVoting._isSessionExpired(votingID, sessionID)) {
            LibVoting._completeSession(votingID, sessionID);
            emit VotingSessionExpired(votingID, matchResult);
            return;
        }

        if (session.status == LibVoting.Status.NotStarted) {
            LibVoting._startSession(votingID, matchResult);
        }

        if (session.workerToVoted[msg.sender] == true) {
            revert LibVoting.AlreadyVoted();
        }

        LibVoting._recordVote(votingID, sessionID);
    }

    /**
     * @notice addWorker - Adds a worker to the whiteList of authorized workers.
     * To be added, a worker should have the `workerRole` credential inside the claimManager
     * @param workerAddress - The address of the worker we want to remove
     */
    function addWorker(address payable workerAddress) external override onlyEnrolledWorkers(workerAddress) {
        LibVoting.VotingStorage storage votingStorage = LibVoting._getStorage();

        if (isWhitelistedWorker(workerAddress)) {
            revert LibVoting.WorkerAlreadyAdded();
        }
        votingStorage.workerToIndex[workerAddress] = LibVoting._getNumberOfWorkers();
        votingStorage.whitelistedWorkers.push(workerAddress);
        emit WorkerAdded(workerAddress, block.timestamp);
    }

    /**
     * @notice removeWorker - Removes a worker from the whiteList of authorized workers
     * The `workerRole` credential of the worker should be revoked before the removal.
     * @param workerToRemove - The address of the worker we want to remove
     */
    function removeWorker(address workerToRemove) external override {
        LibVoting.VotingStorage storage votingStorage = LibVoting._getStorage();
        uint256 numberOfWorkers = LibVoting._getNumberOfWorkers();

        if (!isWhitelistedWorker(workerToRemove)) {
            revert LibVoting.WorkerWasNotAdded(workerToRemove);
        }
        require(workerToRemove.isEnrolledWorker() == false, "Not allowed: still enrolled as worker");

        if (numberOfWorkers > 1) {
            uint256 workerIndex = votingStorage.workerToIndex[workerToRemove];
            // Copy last element to fill the missing place in array
            address payable workerToMove = votingStorage.whitelistedWorkers[numberOfWorkers - 1];
            votingStorage.whitelistedWorkers[workerIndex] = workerToMove;
            votingStorage.workerToIndex[workerToMove] = workerIndex;
        }

        delete votingStorage.workerToIndex[workerToRemove];
        votingStorage.whitelistedWorkers.pop();
        emit WorkerRemoved(workerToRemove, block.timestamp);
    }

    /**
     * @notice Cancels votings that takes longer than time limit
     * @dev only the address referenced as the contract owner is allowed to perform this.
     */
    function cancelExpiredVotings() external override onlyOwner {
        LibVoting.VotingStorage storage votingStorage = LibVoting._getStorage();

        uint256 numberOfVotingIDs = votingStorage.votingIDs.length;
        for (uint256 i; i < numberOfVotingIDs; i++) {
            bytes32 votingID = votingStorage.votingIDs[i];
            LibVoting.Voting storage voting = votingStorage.votingIDToVoting[votingID];
            uint256 numberOfSessionIds = voting.sessionIDs.length;
            for (uint256 j; j < numberOfSessionIds; j++) {
                bytes32 sessionID = voting.sessionIDs[i];
                if (LibVoting._isSessionExpired(votingID, sessionID)) {
                    LibVoting._completeSession(votingID, sessionID);
                    emit VotingSessionExpired(votingID, voting.sessionIDToSession[sessionID].matchResult);
                }
            }
        }
    }

    function setRewardsEnabled(bool rewardsEnabled) external {
        LibReward._setRewardsFeature(rewardsEnabled);
    }

    function getWorkers() external view override returns (address payable[] memory) {
        LibVoting.VotingStorage storage votingStorage = LibVoting._getStorage();

        return votingStorage.whitelistedWorkers;
    }

    function isWhitelistedWorker(address worker) public view returns (bool) {
        LibVoting.VotingStorage storage votingStorage = LibVoting._getStorage();
        uint256 workerIndex = votingStorage.workerToIndex[worker];
        return workerIndex < LibVoting._getNumberOfWorkers() && votingStorage.whitelistedWorkers[workerIndex] == worker;
    }

    /**
     * @notice Returns match results of the worker in the sessions, which has been reached consensus
     */
    function getWorkerVotes(bytes32 votingID, address worker) external view returns (bytes32[] memory votes) {
        bytes32[] memory winningMatches = getWinningMatches(votingID);
        bytes32[] memory votesContainer = new bytes32[](winningMatches.length);
        uint256 numberOfVotes;
        uint256 numberOfWinningMatches = winningMatches.length;

        for (uint256 i; i < numberOfWinningMatches; i++) {
            LibVoting.VotingSession storage session = LibVoting._getSession(votingID, LibVoting._getSessionID(votingID, winningMatches[i]));
            if (LibVoting._hasAlreadyVoted(worker, session)) {
                votesContainer[numberOfVotes] = winningMatches[i];
                numberOfVotes++;
            }
        }

        votes = new bytes32[](numberOfVotes);
        for (uint256 i; i < numberOfVotes; i++) {
            votes[i] = votesContainer[i];
        }
    }

    /**
     * @notice Retreieves the list of workers who voted for the winning macth
     */
    function getWinners(bytes32 votingID, bytes32 matchResult) external view override returns (address payable[] memory) {
        LibVoting.VotingStorage storage votingStorage = LibVoting._getStorage();
        bytes32 sessionID = LibVoting._getSessionID(votingID, matchResult);

        return votingStorage.winners[votingID][sessionID];
    }

    function getWinningMatches(bytes32 votingID) public view returns (bytes32[] memory winningMatches) {
        LibVoting.Voting storage voting = LibVoting._getStorage().votingIDToVoting[votingID];
        uint256 numberOfWinningSessions;
        bytes32[] memory winningSessionsIDs = new bytes32[](voting.sessionIDs.length);
        uint256 numberOfVotingSessionIds = voting.sessionIDs.length;

        for (uint256 i; i < numberOfVotingSessionIds; i++) {
            if (LibVoting._getSession(votingID, voting.sessionIDs[i]).isConsensusReached) {
                winningSessionsIDs[numberOfWinningSessions] = voting.sessionIDs[i];
                numberOfWinningSessions++;
            }
        }

        winningMatches = new bytes32[](numberOfWinningSessions);
        for (uint256 i; i < numberOfWinningSessions; i++) {
            winningMatches[i] = voting.sessionIDToSession[winningSessionsIDs[i]].matchResult;
        }
    }

    function numberOfVotings() external view override returns (uint256) {
        LibVoting.VotingStorage storage votingStorage = LibVoting._getStorage();

        return votingStorage.votingIDs.length;
    }

    function replenishRewardPool() external payable override onlyWhenEnabledRewards {
        if (msg.value == 0) {
            revert NoFundsProvided();
        }
        emit Replenished(msg.value);
        LibReward._payReward(LibReward.getStorage().rewardQueue.length);
    }

    /// @dev Only called when reward payment failes due to insufficient gas
    function payReward(uint256 numberOfPays) external {
        LibReward._payReward(numberOfPays);
    }
}

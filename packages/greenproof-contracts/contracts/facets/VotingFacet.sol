// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import {IVoting} from "../interfaces/IVoting.sol";
import {IReward} from "../interfaces/IReward.sol";
import {LibReward} from "../libraries/LibReward.sol";
import {LibVoting} from "../libraries/LibVoting.sol";
import {LibClaimManager} from "../libraries/LibClaimManager.sol";

/**
 * @title `VotingFacet` - The voting component of the GreenProof core module.
 * @author EnergyWeb Foundation
 * @notice this facet handles all voting functionalities of the greenProof-core module
 * @dev This contract is a facet of the EW-GreenProof-Core Diamond, a gas optimized implementation of EIP-2535 Diamond proxy standard : https://eips.ethereum.org/EIPS/eip-2535
 */
contract VotingFacet is IVoting, IReward {
    modifier onlyEnrolledWorkers(address operator) {
        LibClaimManager.checkEnrolledWorker(operator);
        _;
    }

    modifier onlyOwner() {
        LibClaimManager.checkOwnership();
        _;
    }

    modifier onlyWhitelistedWorker() {
        LibVoting.checkWhiteListedWorker(msg.sender);
        _;
    }

    modifier onlyWhenEnabledRewards() {
        LibReward.checkRewardEnabled();
        _;
    }

    modifier onlyRevokedWorkers(address workerToRemove) {
        LibClaimManager.checkRevokedWorker(workerToRemove);
        _;
    }

    /**
     * @notice Increases the number of votes for this matchResult. Voting completes when that vote leads to consensus or when voting expires
     */
    function vote(bytes32 votingID, bytes32 matchResult) external onlyWhitelistedWorker {
        bytes32 sessionID = LibVoting.checkNotClosedSession(votingID, matchResult);
        uint256 numberOfRewardedWorkers;

        if (LibVoting._isSessionExpired(votingID, sessionID)) {
            numberOfRewardedWorkers = LibVoting._completeSession(votingID, sessionID);
            _emitSessionEvents(votingID, sessionID, numberOfRewardedWorkers);
            emit VotingSessionExpired(votingID, matchResult);
            return;
        }

        LibVoting.VotingSession storage session = LibVoting._getSession(votingID, sessionID);

        if (session.status == LibVoting.Status.NotStarted) {
            LibVoting._startSession(votingID, matchResult);
        }

        LibVoting.checkNotVoted(msg.sender, session);

        numberOfRewardedWorkers = LibVoting._recordVote(votingID, sessionID);
        _emitSessionEvents(votingID, sessionID, numberOfRewardedWorkers);
    }

    /**
     * @notice addWorker - Adds a worker to the whiteList of authorized workers.
     * To be added, a worker should have the `workerRole` credential inside the claimManager
     * @param workerAddress - The address of the worker we want to remove
     */
    function addWorker(address payable workerAddress) external onlyEnrolledWorkers(workerAddress) {
        LibVoting.checkNotWhiteListedWorker(workerAddress);
        LibVoting.VotingStorage storage votingStorage = LibVoting._getStorage();

        votingStorage.workerToIndex[workerAddress] = LibVoting._getNumberOfWorkers();
        votingStorage.whitelistedWorkers.push(workerAddress);
        emit WorkerAdded(workerAddress, block.timestamp);
    }

    /**
     * @notice removeWorker - Removes a worker from the whiteList of authorized workers
     * The `workerRole` credential of the worker should be revoked before the removal.
     * @param workerToRemove - The address of the worker we want to remove
     */
    function removeWorker(address workerToRemove) external onlyRevokedWorkers(workerToRemove) {
        LibVoting.VotingStorage storage votingStorage = LibVoting._getStorage();
        uint256 numberOfWorkers = LibVoting._getNumberOfWorkers();

        LibVoting.checkWhiteListedWorker(workerToRemove);

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
    function cancelExpiredVotings() external onlyOwner {
        LibVoting.VotingStorage storage votingStorage = LibVoting._getStorage();

        uint256 numberOfVotingIDs = votingStorage.votingIDs.length;
        for (uint256 i; i < numberOfVotingIDs; i++) {
            bytes32 votingID = votingStorage.votingIDs[i];
            LibVoting.Voting storage voting = votingStorage.votingIDToVoting[votingID];
            uint256 numberOfSessionIds = voting.sessionIDs.length;
            for (uint256 j; j < numberOfSessionIds; j++) {
                bytes32 sessionID = voting.sessionIDs[i];
                if (LibVoting._isSessionExpired(votingID, sessionID)) {
                    uint256 numberOfRewardedWorkers = LibVoting._completeSession(votingID, sessionID);
                    _emitSessionEvents(votingID, sessionID, numberOfRewardedWorkers);
                    emit VotingSessionExpired(votingID, voting.sessionIDToSession[sessionID].matchResult);
                }
            }
        }
    }

    function setRewardsEnabled(bool rewardsEnabled) external {
        LibReward._setRewardsFeature(rewardsEnabled);
        if (rewardsEnabled) {
            emit RewardsActivated(block.timestamp);
        } else {
            emit RewardsDeactivated(block.timestamp);
        }
    }

    function replenishRewardPool() external payable onlyWhenEnabledRewards {
        LibReward.checkFunds();
        emit Replenished(msg.value);

        uint256 numberOfPays = LibReward.getStorage().rewardQueue.length;
        uint256 rewardedAmount = LibReward._payReward(numberOfPays);
        emit RewardsPaidOut(rewardedAmount);
    }

    /// @dev Only called when reward payment fails due to insufficient gas
    function payReward(uint256 numberOfPays) external {
        uint256 rewardedAmount = LibReward._payReward(numberOfPays);
        emit RewardsPaidOut(rewardedAmount);
    }

    function getWorkers() external view returns (address payable[] memory) {
        LibVoting.VotingStorage storage votingStorage = LibVoting._getStorage();

        return votingStorage.whitelistedWorkers;
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
    function getWinners(bytes32 votingID, bytes32 matchResult) external view returns (address payable[] memory) {
        LibVoting.VotingStorage storage votingStorage = LibVoting._getStorage();
        bytes32 sessionID = LibVoting._getSessionID(votingID, matchResult);

        return votingStorage.winners[votingID][sessionID];
    }

    function numberOfVotings() external view returns (uint256) {
        LibVoting.VotingStorage storage votingStorage = LibVoting._getStorage();

        return votingStorage.votingIDs.length;
    }

    function isWhitelistedWorker(address worker) public view returns (bool) {
        LibVoting.VotingStorage storage votingStorage = LibVoting._getStorage();
        uint256 workerIndex = votingStorage.workerToIndex[worker];
        return workerIndex < LibVoting._getNumberOfWorkers() && votingStorage.whitelistedWorkers[workerIndex] == worker;
    }

    /**
     * @notice getWinningMatches - Returns the list of match results that have reached consensus in a specific voting
     * @param votingID - The id of the voting for which we want to get the winning matches
     * @return winningMatches - An array of bytes32 representing the match results that have reached consensus
     * @dev This function returns the match results that have reached consensus in a specific voting.
     *      It first retrieves all the voting sessions associated with the given votingID and iterates over them to check if consensus is reached.
     *      The match results associated with these sessions are then returned as an array
     */
    function getWinningMatches(bytes32 votingID) public view returns (bytes32[] memory winningMatches) {
        LibVoting.Voting storage voting = LibVoting._getStorage().votingIDToVoting[votingID];
        uint256 numberOfWinningSessions;

        uint256 numberOfVotingSessionIds = voting.sessionIDs.length;

        bytes32[] memory winningSessionsIDs = new bytes32[](numberOfVotingSessionIds);

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

    function _emitSessionEvents(bytes32 votingID, bytes32 sessionID, uint256 numberOfRewardedWorkers) internal {
        LibVoting.VotingSession storage session = LibVoting._getSession(votingID, sessionID);
        if (session.isConsensusReached) {
            emit WinningMatch(votingID, session.matchResult, session.votesCount);
            emit ConsensusReached(session.matchResult, votingID);
            if (numberOfRewardedWorkers > 0) {
                emit RewardsPaidOut(numberOfRewardedWorkers);
            }
        } else {
            emit NoConsensusReached(votingID, sessionID);
        }
        emit Replenished(msg.value);
        LibReward._payReward(LibReward.getStorage().rewardQueue.length);
    }

    /// @dev Only called when reward payment fails due to insufficient gas
    function payReward(uint256 numberOfPays) external onlyWhenEnabledRewards {
        LibReward._payReward(numberOfPays);
    }
}

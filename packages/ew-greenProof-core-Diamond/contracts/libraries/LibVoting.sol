// SPDX-License-Identifier: MIT
pragma solidity ^0.8.8;
import {IRewardVoting} from "../interfaces/IRewardVoting.sol";
import {IVoting} from "../interfaces/IVoting.sol";

import {MerkleProof} from "@solidstate/contracts/cryptography/MerkleProof.sol";

import {LibReward} from "./LibReward.sol";

library LibVoting {
    bytes32 constant VOTING_STORAGE_POSITION = keccak256("ewc.greenproof.voting.diamond.storage");

    struct Voting {
        // Number of votes in this voting
        uint256 numberOfVotes;
        /// Number of replayed votes in this voting
        uint256 numberOfReplayedVotes;
        //Timestamp of first voting
        uint256 start;
        // Number of votes for winning match
        uint256 winningMatchVoteCount;
        /// Number of votes for winning match on replayed votes
        uint256 winningMatchReplayedVoteCount;
        // Input match
        bytes32 matchInput;
        // List of all match results with at least one vote
        bytes32[] matches;
        /// List of all match results with at least one replayed vote
        bytes32[] replayedMatches;
        // Winning match result
        bytes32 winningMatch;
        /// Replayed Winning match result
        bytes32 replayedWinningMatch;
        // Worker address to match result
        mapping(address => bytes32) workerToMatchResult;
        mapping(address => bytes32) workerToReplayedMatchResult;
        // Worker address to voted flag
        mapping(address => bool) workerToVoted;
        mapping(address => mapping(bytes32 => mapping(bytes32 => bool))) workerToReplayedVoted;
        // Match result to total vote count
        mapping(bytes32 => uint256) matchResultToVoteCount;
        /// Match result to total replayed vote count
        mapping(bytes32 => uint256) replayedMatchResultToVoteCount;
        // To decide which actions are currently applicable to voting
        Status status;
        // If none of the match results gets more votes then the others
        bool noConsensus;
        /// If none of the match results gets more replayed votes than the others
        bool noReplayedConsensus;
        //flag to indicate if teh vote targerts settlement data
        bool isSettlement;
        //List of workers replaying the vote: This help updating workerToMatchResult after a replay consensus
        address[] replayVoters;
    }

    struct VotingStorage {
        uint256 timeLimit;
        uint256 numberOfWorkers;
        // Certificate minting contract address
        address certificateContractAddress;
        // Address of voting reward contract
        address rewardVotingAddress;
        //List of all workers
        address payable[] workers;
        bytes32[] matchInputs;
        mapping(address => uint256) workerToIndex;
        mapping(bytes32 => uint256) matchInputToIndex;
        // Worker address to match result
        mapping(bytes32 => Voting) matchInputToVoting;
        mapping(bytes32 => bytes32) matches;
        mapping(bytes32 => bytes32) winningMatches;
        mapping(bytes32 => address payable[]) winnersList;
        // Worker address to match result on a specific matchInput
        mapping(address => mapping(bytes32 => bytes32)) workerVotes;
    }

    enum Status {
        /// Not started or canceled
        NotActive,
        /// Worker can vote
        Active,
        /// Winner match is determined
        Completed
    }

    // Event emitted after voting ended
    event WinningMatch(bytes32 matchInput, bytes32 matchResult, uint256 indexed voteCount);

    // Winning match result can not be determined
    event NoConsensusReached(bytes32 matchInput);

    // Voting lasts more than time limit
    event VotingExpired(bytes32 matchInput);

    // Event emitted after match is recorded
    event MatchRegistered(bytes32 matchInput, bytes32 matchResult);

    event ConsensusReached(bytes32 winningMatch, bytes32 matchInput);

    // Worker had already voted for a match result
    error AlreadyVoted();

    // Sender is not whitelisted
    error NotWhitelisted();

    // Voting ended, winner is chosen - workers cannot vote anymore
    error VotingAlreadyEnded();

    // Worker has been added already
    error WorkerAlreadyAdded();

    // Worker has not been added yet
    error WorkerWasNotAdded();

    // initialize voting parameters at the diamnond construction
    function init(uint256 _timeLimit) internal {
        VotingStorage storage _votingStorage = getStorage();

        _votingStorage.timeLimit = _timeLimit;
    }

    function _isExpired(
        Voting storage currentVote,
        uint256 timeLimit,
        bytes32 matchInput
    ) internal returns (bool) {
        if (currentVote.status == Status.Active && (currentVote.start + timeLimit < block.timestamp)) {
            emit VotingExpired(matchInput);
            return true;
        }
        return false;
    }

    function _replayVote(
        Voting storage voting,
        bytes32 matchInput,
        bytes32 matchResult
    )
        internal
        returns (
            bool shouldUpdateVoting,
            bytes32 replayedWinningMatch,
            uint256 winningMatchReplayedVoteCount
        )
    {
        if (voting.workerToReplayedVoted[msg.sender][matchInput][matchResult]) {
            revert AlreadyVoted();
        }
        voting.workerToReplayedVoted[msg.sender][matchInput][matchResult] = true;
        if (voting.workerToReplayedMatchResult[msg.sender] == 0) {
            voting.replayVoters.push(msg.sender);
        }
        voting.workerToReplayedMatchResult[msg.sender] = matchResult;
        voting.numberOfReplayedVotes++;

        if (voting.replayedMatchResultToVoteCount[matchResult] == 0) {
            voting.replayedMatches.push(matchResult);
        }
        voting.replayedMatchResultToVoteCount[matchResult]++;

        if (voting.replayedMatchResultToVoteCount[matchResult] == voting.winningMatchReplayedVoteCount) {
            voting.noReplayedConsensus = true;
        } else if (voting.replayedMatchResultToVoteCount[matchResult] > voting.winningMatchReplayedVoteCount) {
            voting.noReplayedConsensus = false;
            voting.winningMatchReplayedVoteCount = voting.replayedMatchResultToVoteCount[matchResult];
            voting.replayedWinningMatch = matchResult;

            uint256 nbOfWorkers = IVoting(address(this)).getNumberOfWorkers();
            uint256 majority = (nbOfWorkers / 2) + 1;

            if (voting.winningMatchReplayedVoteCount >= majority) {
                if (voting.noReplayedConsensus == false) {
                    shouldUpdateVoting = true;
                    replayedWinningMatch = voting.replayedWinningMatch;
                    winningMatchReplayedVoteCount = voting.winningMatchReplayedVoteCount;
                }
            }
            if (voting.winningMatchReplayedVoteCount < majority && voting.numberOfReplayedVotes == nbOfWorkers) {
                if (voting.noReplayedConsensus == false) {
                    shouldUpdateVoting = true;
                    replayedWinningMatch = voting.replayedWinningMatch;
                    winningMatchReplayedVoteCount = voting.winningMatchReplayedVoteCount;
                }
            }
        }
    }

    function _startVoting(bytes32 matchInput, bool isSettlement) internal {
        VotingStorage storage votingStorage = getStorage();

        Voting storage voting = votingStorage.matchInputToVoting[matchInput];
        voting.matchInput = matchInput;
        voting.start = block.timestamp;
        voting.status = Status.Active;
        if (isSettlement) {
            voting.isSettlement = true;
        }

        if (
            votingStorage.matchInputToIndex[matchInput] == 0 &&
            (votingStorage.matchInputs.length == 0 || (votingStorage.matchInputs.length > 0 && (votingStorage.matchInputs[0] != matchInput)))
        ) {
            votingStorage.matchInputToIndex[matchInput] = votingStorage.matchInputs.length;
            votingStorage.matchInputs.push(matchInput);
        }
    }

    function _completeVoting(Voting storage voting) internal {
        VotingStorage storage votingStorage = getStorage();

        if (voting.noConsensus) {
            _cancelVoting(voting);
            emit NoConsensusReached(voting.matchInput);
            return;
        }

        registerWinningMatch(voting.matchInput, voting.winningMatch);
        emit WinningMatch(voting.matchInput, voting.winningMatch, voting.winningMatchVoteCount);
        _revealVotes(voting);
        _revealWinners(voting);
        votingStorage.winningMatches[voting.matchInput] = voting.winningMatch;
        if (voting.isSettlement) {
            emit ConsensusReached(voting.winningMatch, voting.matchInput);
        }

        voting.status = Status.Completed;
        _reward(votingStorage.winnersList[voting.matchInput]);
    }

    /// @notice Deletes voting results
    function _cancelVoting(LibVoting.Voting storage voting) internal {
        VotingStorage storage votingStorage = getStorage();

        delete voting.matches;
        for (uint256 i = 0; i < votingStorage.numberOfWorkers; i++) {
            voting.matchResultToVoteCount[voting.workerToMatchResult[votingStorage.workers[i]]] = 0;
            voting.workerToVoted[votingStorage.workers[i]] = false;
            voting.workerToMatchResult[votingStorage.workers[i]] = "";
        }
        voting.status = Status.NotActive;
        voting.winningMatch = "";
        voting.winningMatchVoteCount = 0;
        voting.noConsensus = false;
        voting.numberOfVotes = 0;
        voting.start = 0;
    }

    function registerWinningMatch(bytes32 matchInput, bytes32 matchResult) internal {
        VotingStorage storage votingStorage = getStorage();

        votingStorage.matches[matchInput] = matchResult;
        emit MatchRegistered(matchInput, matchResult);
    }

    function _reward(address payable[] memory winners) internal {
        LibReward.RewardStorage storage rs = LibReward.getStorage();

        for (uint256 i = 0; i < winners.length; i++) {
            rs.rewardQueue.push(winners[i]);
        }
        LibReward.payReward();
    }

    /// @notice Reveals the votes only after the vote is ended
    function _revealVotes(LibVoting.Voting storage voting) internal {
        VotingStorage storage _votingStorage = getStorage();

        for (uint256 i = 0; i < _votingStorage.workers.length; i++) {
            address payable currentWorker = _votingStorage.workers[i];

            _votingStorage.workerVotes[currentWorker][voting.matchInput] = voting.workerToMatchResult[msg.sender];
        }
    }

    /// @notice Workers who voted for winning result
    function _revealWinners(LibVoting.Voting storage voting) internal {
        VotingStorage storage _votingStorage = getStorage();

        uint256 winnerCount = 0;
        bytes32 matchInput = voting.matchInput;
        address payable[] memory _winners = new address payable[](voting.winningMatchVoteCount);

        for (uint256 i = 0; i < _votingStorage.numberOfWorkers; i++) {
            address payable worker = _votingStorage.workers[i];
            if (voting.workerToVoted[worker] && (voting.workerToMatchResult[worker]) == voting.winningMatch) {
                _winners[winnerCount] = worker;
                winnerCount++;
            }
        }
        _votingStorage.winnersList[matchInput] = _winners;
    }

    function _updateWorkersVote(Voting storage voting) internal {
        for (uint256 i = 0; i < voting.replayVoters.length; i++) {
            address replayingVoter = voting.replayVoters[i];

            //Copying the replayed voting result into the final voting list
            voting.workerToMatchResult[replayingVoter] = voting.workerToReplayedMatchResult[replayingVoter];

            //Removing the replayed match result from the temporary voting list
            voting.workerToReplayedMatchResult[replayingVoter] = 0;
        }
    }

    // @notice Number of votes sufficient to determine match winner
    function _majority() internal view returns (uint256) {
        VotingStorage storage votingStorage = getStorage();

        return (votingStorage.numberOfWorkers / 2) + 1;
    }

    function _isClosed(Voting storage vote) internal view returns (bool) {
        return vote.status == Status.Completed;
    }

    function _getWinners(bytes32 matchInput) internal view returns (address payable[] memory _winners) {
        VotingStorage storage _votingStorage = getStorage();

        Voting storage voting = _votingStorage.matchInputToVoting[matchInput];

        _winners = new address payable[](voting.winningMatchVoteCount);
        uint256 winnerCount = 0;
        for (uint256 i = 0; i < _votingStorage.numberOfWorkers; i++) {
            address payable worker = _votingStorage.workers[i];
            if (voting.workerToVoted[worker] && (voting.workerToMatchResult[worker] == voting.winningMatch)) {
                _winners[winnerCount] = worker;
                winnerCount++;
            }
        }
    }

    function isExpired(Voting storage voting) internal view returns (bool) {
        VotingStorage storage votingStorage = getStorage();

        return voting.start + votingStorage.timeLimit < block.timestamp;
    }

    /// @notice Check if this account allowed to vote
    function isWorker(address workerAddress) internal view returns (bool) {
        VotingStorage storage votingStorage = getStorage();

        return votingStorage.workerToIndex[workerAddress] != 0 || (votingStorage.numberOfWorkers > 0 && votingStorage.workers[0] == workerAddress);
    }

    function isNotWorker(address workerAddress) internal view returns (bool) {
        return isWorker(workerAddress) == false;
    }

    /** Data verification */

    /** checks that some data is part of a voting consensus
        @param voteID : the inputHash identifying the vote
        @param dataHash: the hash of the data we ant to verify
        @param dataProof: the merkle proof of the data
        @return `True` if the dataHash is part of the voting merkle root, 'False` otherwise  

     */
    function _isPartOfConsensus(
        bytes32 voteID,
        bytes32 dataHash,
        bytes32[] memory dataProof
    ) internal view returns (bool) {
        bytes32 matchResult = IVoting(address(this)).getWinningMatch(voteID);
        return MerkleProof.verify(dataProof, matchResult, dataHash);
    }

    function _hasNotStarted(Voting storage vote) internal view returns (bool) {
        return vote.status == Status.NotActive;
    }

    function _hasAlreadyVoted(address operator, Voting storage currentVote) internal view returns (bool) {
        return currentVote.workerToVoted[operator];
    }

    function compareStrings(string memory a, string memory b) internal pure returns (bool) {
        return (keccak256(abi.encodePacked((a))) == keccak256(abi.encodePacked((b))));
    }

    function getStorage() internal pure returns (VotingStorage storage _votingStorage) {
        bytes32 position = VOTING_STORAGE_POSITION;

        assembly {
            _votingStorage.slot := position
        }
    }
}

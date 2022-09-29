// SPDX-License-Identifier: MIT
pragma solidity ^0.8.8;
import {IRewardVoting} from "../interfaces/IRewardVoting.sol";
import {MerkleProof} from "@solidstate/contracts/cryptography/MerkleProof.sol";

library LibVoting {
    bytes32 constant VOTING_STORAGE_POSITION = keccak256("ewc.greenproof.voting.diamond.storage");

    struct Voting {
        // Number of votes in this voting
        uint256 numberOfVotes;
        //Timestamp of first voting
        uint256 start;
        // Number of votes for winning match
        uint256 winningMatchVoteCount;
        // Input match
        bytes32 matchInput;
        // List of all match results with at least one vote
        bytes32[] matches;
        // Winning match result
        bytes32 winningMatch;
        // Worker address to match result
        // mapping(address => string) workerToMatchResult;
        mapping(address => bytes32) workerToMatchResult;
        // Worker address to voted flag
        mapping(address => bool) workerToVoted;
        // Match result to total vote count
        // mapping(string => uint256) matchResultToVoteCount;
        mapping(bytes32 => uint256) matchResultToVoteCount;
        // To decide which actions are currently applicable to voting
        Status status;
        // If none of the match results gets more votes then the others
        bool noConsensus;
        //flag to indicate if teh vote targerts settlement data
        bool isSettlement;
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
    }

    struct DataProof {
        uint256 proofID;
        bytes32 rootHash;
        bytes32[] proofPath;
        bytes32 leaf;
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

    // Voting lasts more then time limit
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

    function getStorage() internal pure returns (VotingStorage storage _votingStorage) {
        bytes32 position = VOTING_STORAGE_POSITION;

        assembly {
            _votingStorage.slot := position
        }
    }

    // initialize voting parameters at the diamnond construction
    function init(uint256 _timeLimit) internal {
        VotingStorage storage _votingStorage = getStorage();

        _votingStorage.timeLimit = _timeLimit;
    }

    // @notice Number of votes sufficient to determine match winner
    function majority() internal view returns (uint256) {
        VotingStorage storage votingStorage = getStorage();

        return (votingStorage.numberOfWorkers / 2) + 1;
    }

    function startVoting(bytes32 matchInput, bool isSettlement) internal {
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

    function completeVoting(Voting storage voting) internal {
        if (voting.noConsensus) {
            cancelVoting(voting);
            emit NoConsensusReached(voting.matchInput);
            return;
        }

        emit WinningMatch(voting.matchInput, voting.winningMatch, voting.winningMatchVoteCount);
        registerWinningMatch(voting.matchInput, voting.winningMatch);
        if (voting.isSettlement) {
            emit ConsensusReached(voting.winningMatch, voting.matchInput);
        }

        voting.status = Status.Completed;
        IRewardVoting(address(this)).reward(_getWinners(voting.matchInput));
    }

    /// @notice Deletes voting results
    function cancelVoting(LibVoting.Voting storage voting) internal {
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

    function compareStrings(string memory a, string memory b) internal pure returns (bool) {
        return (keccak256(abi.encodePacked((a))) == keccak256(abi.encodePacked((b))));
    }

    function registerWinningMatch(bytes32 matchInput, bytes32 matchResult) internal {
        VotingStorage storage votingStorage = getStorage();

        votingStorage.matches[matchInput] = matchResult;
        emit MatchRegistered(matchInput, matchResult);
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

    function _isVoteRecorded(bytes32 _matchInput) internal view returns (bool) {
        VotingStorage storage votingStorage = getStorage();

        return votingStorage.matches[_matchInput] != 0;
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
    ) internal pure returns (bool) {
        return MerkleProof.verify(dataProof, voteID, dataHash);
    }
}

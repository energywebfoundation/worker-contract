// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import {LibReward} from "./LibReward.sol";
import {IVoting} from "../interfaces/IVoting.sol";

import {MerkleProof} from "@solidstate/contracts/cryptography/MerkleProof.sol";

library LibVoting {
    bytes32 constant VOTING_STORAGE_POSITION = keccak256("ewc.greenproof.voting.diamond.storage");

    struct Voting {
        bytes32[] sessionIDs;
        mapping(bytes32 => VotingSession) sessionIDToSession;
    }

    /// Represents voting for given pair of (matchInput, matchResult)
    struct VotingSession {
        // Number of votes in this voting
        uint256 votesCount;
        //Timestamp of first voting
        uint256 startTimestamp;
        // Winning match result
        bytes32 matchResult;
        // Worker address to voted flag
        mapping(address => bool) workerToVoted;
        // To decide which actions are currently applicable to voting
        Status status;
        // If count of votes is enough for consensus
        bool isConsensusReached;
    }

    /**
     * @title `VotingStarage` is the structured storage workspace of all storage variables related to voting component
     * @notice Whenever you wish to update your app and add more variable to the storage, make sure to add them at the end of te struct
     */
    struct VotingStorage {
        uint256 timeLimit /* limit of duration of a voting session. The vote is considered expired after `startTimestamp` + `timeLimit` */;
        uint256 majorityPercentage /* Percentage of workers that have to vote on the same result to reach the majority  */;
        address payable[] whitelistedWorkers /* List of all whitelisted workers */;
        bytes32[] votingIDs /* List of all voting identifiers */;
        mapping(bytes32 => Voting) votingIDToVoting /* Quick access to a specific voting */;
        mapping(address => uint256) workerToIndex /* Quick access to a specific worker's index inside the `workers` whitelist */;
        // Next two fields are used to expose result of completed voting session
        mapping(bytes32 => mapping(bytes32 => bytes32)) matches /* Records the consensus of a specific votingID/sessionID */;
        mapping(bytes32 => mapping(bytes32 => address payable[])) winners /* Records the addresses of the workers who voted the winning consensus. This is needed to reward the right workers */;
    }

    enum Status {
        NotStarted,
        /// Worker can vote
        Started,
        /// Consensus has been reached
        Completed
    }

    // Event emitted when consensus in voting sessing has been reached
    event WinningMatch(bytes32 votingID, bytes32 matchResult, uint256 indexed voteCount);

    // Winning match result can not be determined
    event NoConsensusReached(bytes32 votingID, bytes32 sessionID);

    // Voting lasts more than time limit
    event VotingSessionExpired(bytes32 votingID);

    // Event emitted after match is recorded
    event MatchRegistered(bytes32 votingID, bytes32 matchResult);

    event ConsensusReached(bytes32 winningMatch, bytes32 votingID);

    // Worker had already voted for a match result
    error AlreadyVoted();

    // Sender is not whitelisted
    error NotWhitelisted();

    // Voting ended, winner is chosen - workers cannot vote anymore
    error VotingAlreadyEnded();

    // Worker has been added already
    error WorkerAlreadyAdded();

    // Worker has not been added yet
    error WorkerWasNotAdded(address notWhitListedWorker);

    error SessionCannotBeRestarted(bytes32 inputHash, bytes32 matchResult);

    // initialize voting parameters at the diamond construction
    function init(uint256 _timeLimit, uint256 _majorityPercentage) internal {
        VotingStorage storage _votingStorage = _getStorage();

        _votingStorage.timeLimit = _timeLimit;
        _votingStorage.majorityPercentage = _majorityPercentage;
    }

    /**
     * @notice _isSessionExpired: Checks if a voting session has exceeded the `timeLimit`
     * @param sessionID - The voting session ID which validity we want to check
     * @return isSessionExpired : boolean
     * @dev the timeLimit duration is set once during contract construction
     */
    function _isSessionExpired(bytes32 votingID, bytes32 sessionID) internal view returns (bool) {
        VotingSession storage session = _getSession(votingID, sessionID);
        if (session.status == Status.Started && (session.startTimestamp + _getStorage().timeLimit < block.timestamp)) {
            return true;
        } else {
            return false;
        }
    }

    /**
     * @notice _recordVote: stores worker's vote
     */
    function _recordVote(bytes32 votingID, bytes32 sessionID) internal {
        VotingSession storage session = _getSession(votingID, sessionID);
        session.votesCount++;
        session.workerToVoted[msg.sender] = true;

        if (_hasReachedConsensus(session)) {
            session.isConsensusReached = true;
            _completeSession(votingID, sessionID);
        }
    }

    function _startSession(bytes32 votingID, bytes32 matchResult) internal {
        /// There can not be voting without some session
        if (_getStorage().votingIDToVoting[votingID].sessionIDs.length == 0) {
            _getStorage().votingIDs.push(votingID);
        }

        Voting storage voting = _getStorage().votingIDToVoting[votingID];
        bytes32 sessionID = _getSessionID(votingID, matchResult);
        VotingSession storage session = voting.sessionIDToSession[sessionID];

        session.matchResult = matchResult;
        session.startTimestamp = block.timestamp;
        session.status = Status.Started;
        voting.sessionIDs.push(sessionID);
    }

    /**
     * @notice No further votes are accounted. If consensus has been reached then reward is paid and session results are exposed
     */
    function _completeSession(bytes32 votingID, bytes32 sessionID) internal {
        Voting storage voting = _getStorage().votingIDToVoting[votingID];
        VotingSession storage session = voting.sessionIDToSession[sessionID];
        session.status = Status.Completed;

        if (!session.isConsensusReached) {
            emit NoConsensusReached(votingID, sessionID);
            return;
        }

        _revealMatch(votingID, sessionID);
        _revealVoters(votingID, sessionID);

        emit WinningMatch(votingID, session.matchResult, session.votesCount);
        emit ConsensusReached(session.matchResult, votingID);

        if (LibReward._isRewardEnabled()) {
            _rewardWinners(votingID, sessionID);
        }
    }

    function _getSessionID(bytes32 votingID, bytes32 matchResult) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(votingID, matchResult));
    }

    /**
     * @notice Exposes result of the session
     */
    function _revealMatch(bytes32 votingID, bytes32 sessionID) internal {
        VotingSession storage session = _getSession(votingID, sessionID);
        _getStorage().matches[votingID][sessionID] = session.matchResult;
        emit MatchRegistered(votingID, session.matchResult);
    }

    /**
     * @notice Exposes workers, which voted in session
     */
    function _revealVoters(bytes32 votingID, bytes32 sessionID) internal {
        VotingStorage storage _votingStorage = _getStorage();
        _votingStorage.winners[votingID][sessionID] = _getVoters(votingID, sessionID);
    }

    /**
     * @notice sends rewards to workers who casted winning vote
     * @dev On missing funds, will add in the rewardQueue only the voters who could not be rewarded
     */
    function _rewardWinners(bytes32 votingID, bytes32 sessionID) internal {
        LibReward.RewardStorage storage rs = LibReward.getStorage();
        address payable[] memory votingWinners = _getStorage().winners[votingID][sessionID];

        uint256 rewardAmount = rs.rewardAmount;
        uint256 numberOfVotingWinners = votingWinners.length;

        for (uint256 i; i < numberOfVotingWinners; i++) {
            if (address(this).balance >= rewardAmount) {
                votingWinners[i].transfer(rewardAmount);
            } else {
                rs.rewardQueue.push(votingWinners[i]);
            }
        }
    }

    /**
     *  @notice Number of votes sufficient to determine match winner
     */
    function _hasReachedConsensus(VotingSession storage session) internal view returns (bool) {
        return _hasMajority(session.votesCount);
    }

    /**
     * @notice Number of votes sufficient to determine match winner
     */
    function _hasMajority(uint256 numberOfWinningVotes) internal view returns (bool) {
        VotingStorage storage votingStorage = _getStorage();

        return ((100 * numberOfWinningVotes) / _getNumberOfWorkers()) >= votingStorage.majorityPercentage;
    }

    function _isClosed(VotingSession storage vote) internal view returns (bool) {
        return vote.status == Status.Completed;
    }

    function _getNumberOfWorkers() internal view returns (uint256) {
        VotingStorage storage votingStorage = _getStorage();

        return votingStorage.whitelistedWorkers.length;
    }

    function _getVoters(bytes32 votingID, bytes32 sessionID) internal view returns (address payable[] memory _voters) {
        VotingStorage storage _votingStorage = _getStorage();

        VotingSession storage session = _votingStorage.votingIDToVoting[votingID].sessionIDToSession[sessionID];

        uint256 numberOfWorkers = _getNumberOfWorkers();
        address payable[] memory workersList = _votingStorage.whitelistedWorkers;

        _voters = new address payable[](session.votesCount);
        uint256 votersCount = 0;
        for (uint256 i; i < numberOfWorkers; i++) {
            address payable worker = workersList[i];
            if (session.workerToVoted[worker]) {
                _voters[votersCount] = worker;
                votersCount++;
            }
        }
    }

    function _getSession(bytes32 votingID, bytes32 sessionID) internal view returns (VotingSession storage) {
        return _getStorage().votingIDToVoting[votingID].sessionIDToSession[sessionID];
    }

    /** Data verification */

    /** checks that some data is part of a voting consensus
        @param votingID : the inputHash identifying the vote
        @param dataHash: the hash of the data we want to verify
        @param dataProof: the merkle proof of the data
        @return `True` if the dataHash is part of the voting merkle root, 'False` otherwise  

     */
    function _isPartOfConsensus(bytes32 votingID, bytes32 dataHash, bytes32[] memory dataProof) internal view returns (bool) {
        bytes32[] memory matchResults = IVoting(address(this)).getWinningMatches(votingID);
        uint256 numberOfMatchResults = matchResults.length;
        for (uint256 i; i < numberOfMatchResults; i++) {
            if (MerkleProof.verify(dataProof, matchResults[i], dataHash)) {
                return true;
            }
        }
        return false;
    }

    function _hasAlreadyVoted(address operator, VotingSession storage session) internal view returns (bool) {
        return session.workerToVoted[operator];
    }

    function _getStorage() internal pure returns (VotingStorage storage _votingStorage) {
        bytes32 position = VOTING_STORAGE_POSITION;

        assembly {
            _votingStorage.slot := position
        }
    }
}

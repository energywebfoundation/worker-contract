// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import {LibReward} from "./LibReward.sol";
import {IVoting} from "../interfaces/IVoting.sol";
import {MerkleProof} from "@solidstate/contracts/cryptography/MerkleProof.sol";

library LibVoting {
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
        //records each worker voting in this vote session
        address payable[] voters;
        // To decide which actions are currently applicable to voting
        Status status;
        // If count of votes is enough for consensus
        bool isConsensusReached;
    }

    /**
     * @title `VotingStorage` is the structured storage workspace of all storage variables related to voting component
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

    bytes32 private constant VOTING_STORAGE_POSITION = keccak256("ewc.greenproof.voting.diamond.storage");

    error AlreadyVoted(address worker); // Worker had already voted for a match result
    error NotInConsensus(bytes32 voteID); // Vote is not part of consensus
    error NotWhitelisted(address operator); // Sender is not whitelisted
    error AlreadyWhitelistedWorker(address worker); // Worker has already been added
    error SessionCannotBeRestarted(bytes32 inputHash, bytes32 matchResult); // Vote session is closed

    // initialize voting parameters at the diamond construction
    function init(uint256 _timeLimit, uint256 _majorityPercentage) internal {
        VotingStorage storage _votingStorage = _getStorage();

        _votingStorage.timeLimit = _timeLimit;
        _votingStorage.majorityPercentage = _majorityPercentage;
    }

    /**
     * @notice _recordVote: stores worker's vote
     */
    function _recordVote(bytes32 votingID, bytes32 sessionID) internal returns (uint256 numberOfRewardedWorkers) {
        VotingSession storage session = _getSession(votingID, sessionID);

        session.voters.push(payable(msg.sender));
        session.votesCount++;
        session.workerToVoted[msg.sender] = true;

        if (_hasReachedConsensus(session)) {
            session.isConsensusReached = true;
            numberOfRewardedWorkers = _completeSession(votingID, sessionID);
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
    function _completeSession(bytes32 votingID, bytes32 sessionID) internal returns (uint256 numberOfRewardedWorkers) {
        Voting storage voting = _getStorage().votingIDToVoting[votingID];
        VotingSession storage session = voting.sessionIDToSession[sessionID];
        session.status = Status.Completed;

        if (!session.isConsensusReached) {
            return 0;
        }

        _revealMatch(votingID, sessionID);
        _revealVoters(votingID, sessionID);

        if (LibReward.isRewardEnabled()) {
            numberOfRewardedWorkers = _rewardWinners(votingID, sessionID);
        }
    }

    /**
     * @notice Exposes result of the session
     */
    function _revealMatch(bytes32 votingID, bytes32 sessionID) internal {
        VotingSession storage session = _getSession(votingID, sessionID);
        _getStorage().matches[votingID][sessionID] = session.matchResult;
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
    function _rewardWinners(bytes32 votingID, bytes32 sessionID) internal returns (uint256 numberOfPayments) {
        LibReward.RewardStorage storage rs = LibReward.getStorage();
        address payable[] memory votingWinners = _getStorage().winners[votingID][sessionID];

        uint256 rewardAmount = rs.rewardAmount;
        uint256 numberOfVotingWinners = votingWinners.length;

        for (uint256 i; i < numberOfVotingWinners; i++) {
            if (address(this).balance >= rewardAmount) {
                /// @dev `transfer` is safe, because worker is EOA
                votingWinners[i].transfer(rewardAmount);
                numberOfPayments++;
            } else {
                rs.rewardQueue.push(votingWinners[i]);
            }
        }
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

    function isWhitelistedWorker(address worker) internal view returns (bool) {
        VotingStorage storage votingStorage = _getStorage();
        uint256 workerIndex = votingStorage.workerToIndex[worker];
        return workerIndex < _getNumberOfWorkers() && votingStorage.whitelistedWorkers[workerIndex] == worker;
    }

    function _getNumberOfWorkers() internal view returns (uint256) {
        VotingStorage storage votingStorage = _getStorage();

        return votingStorage.whitelistedWorkers.length;
    }

    function _getVoters(bytes32 votingID, bytes32 sessionID) internal view returns (address payable[] memory) {
        VotingSession storage session = _getSession(votingID, sessionID);
        return session.voters;
    }

    function _getSession(bytes32 votingID, bytes32 sessionID) internal view returns (VotingSession storage) {
        return _getStorage().votingIDToVoting[votingID].sessionIDToSession[sessionID];
    }

    /** Data verification */

    /** checks that some data is part of a voting consensus
        @param voteID : the inputHash identifying the vote
        @param dataHash: the hash of the data we want to verify
        @param dataProof: the merkle proof of the data
     */
    function checkVoteInConsensus(bytes32 voteID, bytes32 dataHash, bytes32[] memory dataProof) internal view {
        bytes32[] memory matchResults = IVoting(address(this)).getWinningMatches(voteID);
        uint256 numberOfMatchResults = matchResults.length;
        for (uint256 i; i < numberOfMatchResults; i++) {
            if (MerkleProof.verify(dataProof, matchResults[i], dataHash)) {
                return;
            }
        }
        revert NotInConsensus(voteID);
    }

    function checkNotClosedSession(bytes32 votingID, bytes32 matchResult) internal view returns (bytes32) {
        bytes32 sessionID = _getSessionID(votingID, matchResult);

        LibVoting.VotingSession storage session = _getSession(votingID, sessionID);

        if (_isClosed(session)) {
            revert SessionCannotBeRestarted(votingID, matchResult);
        }
        return sessionID;
    }

    function checkNotVoted(address operator, VotingSession storage session) internal view {
        if (session.workerToVoted[operator] == true) {
            revert AlreadyVoted(operator);
        }
    }

    function checkWhiteListedWorker(address operator) internal view {
        if (!isWhitelistedWorker(operator)) {
            revert NotWhitelisted(operator);
        }
    }

    function checkNotWhiteListedWorker(address operator) internal view {
        if (isWhitelistedWorker(operator)) {
            revert AlreadyWhitelistedWorker(operator);
        }
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

    function _getSessionID(bytes32 votingID, bytes32 matchResult) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(votingID, matchResult));
    }
}

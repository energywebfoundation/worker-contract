//SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

interface IVoting {
    // Event emitted when consensus in voting session has been reached
    event WinningMatch(bytes32 votingID, bytes32 matchResult, uint256 indexed voteCount);

    // Winning match result can not be determined
    event NoConsensusReached(bytes32 votingID, bytes32 sessionID);

    // Voting lasts more than time limit
    event VotingSessionExpired(bytes32 votingID, bytes32 sessionID);

    // Event emitted after match is recorded
    event MatchRegistered(bytes32 votingID, bytes32 matchResult);

    event ConsensusReached(bytes32 winningMatch, bytes32 votingID);

    event WorkerRemoved(address indexed worker, uint256 indexed removalDate);

    event WorkerAdded(address indexed worker, uint256 indexed removalDate);

    function vote(bytes32 votingID, bytes32 matchResult) external;

    function addWorker(address payable workerAddress) external;

    function removeWorker(address workerToRemove) external;

    function getWorkerVotes(bytes32 inputHash, address worker) external returns (bytes32[] memory matchResults);

    function getWorkers() external view returns (address payable[] memory);

    function getWinners(bytes32 votingID, bytes32 matchResult) external view returns (address payable[] memory);

    function getWinningMatches(bytes32 votingID) external view returns (bytes32[] memory);

    function numberOfVotings() external view returns (uint256);

    function cancelExpiredVotings() external;
}

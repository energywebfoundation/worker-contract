//SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

interface IVoting {
    // Event emitted after voting ended
    event WinningMatch(bytes32 matchInput, bytes32 matchResult, uint256 indexed voteCount);

    // Event emitted after a voting consensus is reached
    event ConsensusReached(bytes32 winningMatch, bytes32 matchInput);

    // Winning match result can not be determined
    event NoConsensusReached(bytes32 matchInput);

    // Voting lasts more then time limit
    event VotingExpired(bytes32 matchInput);

    // Event emitted after match is recorded
    event MatchRegistered(bytes32 matchInput, bytes32 matchResult);

    function vote(bytes32 voteID, bytes32 matchResult) external;

    function addWorker(address payable workerAddress) external;

    function removeWorker(address workerToRemove) external;

    function cancelExpiredVotings() external;

    function getNumberOfWorkers() external view returns (uint256);

    function getWorkers() external view returns (address payable[] memory);

    function getWinningMatch(bytes32 voteID) external view returns (bytes32);

    function getWinners(bytes32 voteID) external view returns (address payable[] memory);

    function getWorkerVote(bytes32 voteID, address workerAddress) external view returns (bytes32 matchResult);

    function numberOfvotingSessions() external view returns (uint256);
}

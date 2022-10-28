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

    function getNumberOfWorkers() external view returns (uint256);

    function getWorkers() external view returns (address[] memory);

    function getWinningMatch(bytes32 matchInput) external view returns (bytes32);

    function winners(bytes32 matchInput) external view returns (address payable[] memory);

    function getWorkerVote(bytes32 matchInput, address workerAddress) external view returns (bytes32 matchResult);
}

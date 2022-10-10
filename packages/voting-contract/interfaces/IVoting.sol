//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IVoting {
    /// Event emitted after voting ended
    event WinningMatch(
        string indexed matchInput,
        bytes32 matchResult,
        uint256 voteCount
    );

    /// Winning match result can not be determined
    event NoConsensusReached(string indexed matchInput);

    /// Voting lasts more then time limit
    event VotingExpired(string indexed matchInput);

    /// Worker had already voted for a match result
    error AlreadyVoted();

    /// Sender is not whitelisted
    error NotWhitelisted();

    /// Voting ended, winner is chosen - workers cannot vote anymore
    error VotingAlreadyEnded();

    /// Worker has been added already
    error WorkerAlreadyAdded();

    /// Worker has not been added yet
    error WorkerWasNotAdded();

    function getNumberOfWorkers() external view returns (uint256);

    function getWorkers() external view returns (address[] memory);
}

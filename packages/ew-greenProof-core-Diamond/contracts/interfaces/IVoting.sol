//SPDX-License-Identifier: MIT
pragma solidity ^0.8.8;

interface IVoting {
     // Event emitted after voting ended
    event WinningMatch(string indexed matchInput, string indexed matchResult, uint256 indexed voteCount);

    // Winning match result can not be determined
    event NoConsensusReached(string indexed matchInput);

    // Voting lasts more then time limit
    event VotingExpired(string indexed matchInput);

    // Event emitted after match is recorded
    event MatchRegistered(string matchInput, string matchResult);

}
   

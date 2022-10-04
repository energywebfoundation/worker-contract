// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../interfaces/IVoting.sol";

library LibVoting {
    enum Status {
        /// Not started or canceled
        NotActive,
        /// Worker can vote
        Active,
        /// Winner match is determined
        Completed
    }

    struct Voting {
        /// Input match
        string matchInput;
        /// List of all match results with at least one vote
        bytes32[] matches;
        /// List of all match results with at least one replayed vote
        bytes32[] replayedMatches;
        /// Worker address to match result
        mapping(address => bytes32) workerToMatchResult;
        mapping(address => bytes32) workerToReplayedMatchResult;
        /// Worker address to voted flag
        mapping(address => bool) workerToVoted;
        mapping(address => mapping(string => mapping(bytes32 => bool))) workerToReplayedVoted;
        /// Match result to total vote count
        mapping(bytes32 => uint256) matchResultToVoteCount;
        /// Match result to total replayed vote count
        mapping(bytes32 => uint256) replayedMatchResultToVoteCount;
        /// To decide which actions are currently applicable to voting
        Status status;
        /// Winning match result
        bytes32 winningMatch;
        /// Replayed Winning match result
        bytes32 replayedWinningMatch;
        /// Number of votes for winning match
        uint256 winningMatchVoteCount;
        /// Number of votes for winning match on replayed votes
        uint256 winningMatchReplayedVoteCount;
        /// If none of the match results gets more votes than the others
        bool noConsensus;
        /// If none of the match results gets more replayed votes than the others
        bool noReplayedConsensus;
        /// Number of votes in this voting
        uint256 numberOfVotes;
        /// Number of replayed votes in this voting
        uint256 numberOfReplayedVotes;
        ///Timestamp of first voting
        uint256 start;
        //List of workers replaying the vote: This help updating workerToMatchResult after a replay consensus
        address[] replayVoters;
    }

    // Event emitted after voting ended
    event WinningMatch(
        string indexed matchInput,
        bytes32 matchResult,
        uint256 voteCount
    );

    // Winning match result can not be determined
    event NoConsensusReached(string indexed matchInput);

    // Voting lasts more then time limit
    event VotingExpired(string indexed matchInput);

    function _isClosed(Voting storage vote) internal view returns (bool) {
        return vote.status == Status.Completed;
    }

    function _hasNotStarted(Voting storage vote) internal view returns (bool) {
        return vote.status == Status.NotActive;
    }

    function _isExpired(
        Voting storage currentVote,
        uint256 timeLimit,
        string memory matchInput
    ) internal returns (bool) {
        if (
            currentVote.status == Status.Active &&
            (currentVote.start + timeLimit < block.timestamp)
        ) {
            emit VotingExpired(matchInput);
            return true;
        }
        return false;
    }

    function _hasAlreadyVoted(address operator, Voting storage currentVote)
        internal
        view
        returns (bool)
    {
        return currentVote.workerToVoted[operator];
    }

    function _replayVote(
        Voting storage voting,
        string memory matchInput,
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
            revert IVoting.AlreadyVoted();
        }
        voting.workerToReplayedVoted[msg.sender][matchInput][
            matchResult
        ] = true;
        if (voting.workerToReplayedMatchResult[msg.sender] == 0) {
            voting.replayVoters.push(msg.sender);
        }
        voting.workerToReplayedMatchResult[msg.sender] = matchResult;
        voting.numberOfReplayedVotes++;

        if (voting.replayedMatchResultToVoteCount[matchResult] == 0) {
            voting.replayedMatches.push(matchResult);
        }
        voting.replayedMatchResultToVoteCount[matchResult]++;

        if (
            voting.replayedMatchResultToVoteCount[matchResult] ==
            voting.winningMatchReplayedVoteCount
        ) {
            voting.noReplayedConsensus = true;
        } else if (
            voting.replayedMatchResultToVoteCount[matchResult] >
            voting.winningMatchReplayedVoteCount
        ) {
            voting.noReplayedConsensus = false;
            voting.winningMatchReplayedVoteCount = voting
                .replayedMatchResultToVoteCount[matchResult];
            voting.replayedWinningMatch = matchResult;

            uint256 nbOfWorkers = IVoting(address(this)).getNumberOfWorkers();
            uint256 majority = (nbOfWorkers / 2) + 1;

            if (voting.winningMatchReplayedVoteCount >= majority) {
                if (voting.noReplayedConsensus == false) {
                    shouldUpdateVoting = true;
                    replayedWinningMatch = voting.replayedWinningMatch;
                    winningMatchReplayedVoteCount = voting
                        .winningMatchReplayedVoteCount;
                }
            }
            if (
                voting.winningMatchReplayedVoteCount < majority &&
                voting.numberOfReplayedVotes == nbOfWorkers
            ) {
                if (voting.noReplayedConsensus == false) {
                    shouldUpdateVoting = true;
                    replayedWinningMatch = voting.replayedWinningMatch;
                    winningMatchReplayedVoteCount = voting
                        .winningMatchReplayedVoteCount;
                }
            }
        }
    }

    function updateWorkersVote(Voting storage voting) internal {
        for (uint256 i = 0; i < voting.replayVoters.length; i++) {
            address replayingVoter = voting.replayVoters[i];

            //Copying the replayed voting result into the final voting list
            voting.workerToMatchResult[replayingVoter] = voting
                .workerToReplayedMatchResult[replayingVoter];

            //Removing the replayed match result from the temporary voting list
            voting.workerToReplayedMatchResult[replayingVoter] = 0;
        }
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;
import {LibVoting} from "./LibVoting.sol";

library LibReplayVoting {
    // Worker had already replayed
    error AlreadyReplayed();

    /**
     * @notice _replayVote: Allows workers to correct their votes. Repayed votes makes difference only if their number enough to reach consensus and consensus among workers voted just once has not been reached
     * @param _voting - The voting session under which we want to revote
     * @param matchResult - the corrected vote of the worker
     */
    function _replayVote(LibVoting.Voting storage _voting, bytes32 matchResult)
        internal
        returns (
            bool shouldUpdateVoting,
            bytes32 replayedWinningMatch,
            uint256 newVoteCount
        )
    {
        LibVoting.Voting storage voting = LibVoting.getStorage().voteIDToReplayedVoting[_voting.voteID];
        if (voting.workerToMatchResult[msg.sender] != 0) {
            revert AlreadyReplayed();
        }

        LibVoting._recordVote(voting, matchResult);
    }

    function _replayVoting(LibVoting.Voting storage voting) internal {}

    function _replaceVotesWithReplayed(LibVoting.Voting storage voting) internal {
        LibVoting.Voting storage replayedVoting = LibVoting.getStorage().voteIDToReplayeVoting[voting.voteID];
        address[] storage workers = LibVoting.getStorage().workers;
        // for (uint256 i = 0; i < replayedVoting.voters.length; i++) {
        for (uint256 i = 0; i < workers.length; i++) {
            address worker = workers[i];
            // address replayingVoter = voting.replayVoters[i];

            //Copying the replayed voting result into the final voting list
            // voting.workerToMatchResult[replayingVoter] = voting.workerToReplayedMatchResult[replayingVoter];
            voting.workerToMatchResult[worker] = replayedVoting.workerToMatchResult[worker];

            //Removing the replayed match result from the temporary voting list
            // voting.workerToReplayedMatchResult[replayingVoter] = 0;
        }
    }

    /**
     * @notice _updateVoteResult: update the stored vote result after a consensus is reached on a replayed voting session
     * @param voting - The current voting session
     */
    function _updateVoteResult(LibVoting.Voting storage voting)
        internal
        returns (
            // bytes32 newWinningMatch,
            // uint256 newVoteCount
            bool differentWinningMatch
        )
    {
        // VotingStorage storage votingStorage = getStorage();
        Voting storage replayedVoting = getStorage().voteIDToReplayedVoting[voting.voteID];
        // bytes32 voteID = voting.voteID;

        // bytes32 currentWinningMatch = votingStorage.voteIDToVoting[voteID].winningMatch;

        voting.winningMatchVoteCount = replayedVoting.winninMatchVoteCount;
        //we prevent updating if the final winning match did not change
        // bool hasDifferentWinningMatch = currentWinningMatch != newWinningMatch;
        if (voting.winningMatch != replayedVoting.winningMatch) {
            voting.winningMatch = replayedVoting.winningMatch;
            // votingStorage.voteIDToVoting[voteID].winningMatch = voting.winningMatch;

            //We update winningMatches list
            votingStorage.winningMatches[voteID] = replayedVoting.winningMatch;
        }

        // We update the final vote with the replayed vote
        for (uint256 i; i < voting.replayVoters.length; i++) {
            address worker = voting.replayVoters[i];

            votingStorage.workerVotes[worker][voteID] = voting.workerToMatchResult[worker];
            votingStorage.voteIDToVoting[voteID].workerToMatchResult[worker] = voting.workerToMatchResult[worker];
        }

        return hasDifferentWinningMatch;
    }
}

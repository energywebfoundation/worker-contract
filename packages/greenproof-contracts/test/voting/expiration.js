const { expect } = require("chai");
const { timeTravel } = require("../utils/time.utils");
const {
  DEFAULT_VOTING_TIME_LIMIT,
} = require("../../scripts/deploy/deployContracts");

module.exports.expirationTests = function () {
  let workers;
  let votingContract;
  let timeframes;
  let setupVotingContract;

  beforeEach(function () {
    ({ workers, timeframes, setupVotingContract } = this);
  });

  it("voting which exceeded time limit can be canceled", async () => {
    votingContract = await setupVotingContract({
      participatingWorkers: [workers[0], workers[1], workers[2]],
    });

    await workers[0].vote(timeframes[0].input, timeframes[0].output);
    await workers[0].vote(timeframes[0].input, timeframes[1].output);
    await workers[0].vote(timeframes[1].input, timeframes[0].output);
    await workers[0].vote(timeframes[1].input, timeframes[1].output);

    await timeTravel(2 * DEFAULT_VOTING_TIME_LIMIT);
    const maxVotesToCancel = 100;
    const maxSessionsPerVoteToCancel = 2
    const tx = await votingContract.cancelExpiredVotings(maxVotesToCancel, maxSessionsPerVoteToCancel);

    await expect(tx)
      .to.emit(votingContract, "VotingSessionExpired")
      .withArgs(timeframes[0].input, timeframes[0].output);
    await expect(tx)
      .to.emit(votingContract, "VotingSessionExpired")
      .withArgs(timeframes[0].input, timeframes[1].output);
    await expect(tx)
      .to.emit(votingContract, "VotingSessionExpired")
      .withArgs(timeframes[1].input, timeframes[0].output);
    await expect(tx)
      .to.emit(votingContract, "VotingSessionExpired")
      .withArgs(timeframes[1].input, timeframes[1].output);
    
    const tx2 = await votingContract.cancelExpiredVotings(maxVotesToCancel, maxSessionsPerVoteToCancel);

    await expect(tx2).to.not.emit(votingContract, "VotingSessionExpired")
  });

  it("voting which don't exceeded time limit are not cancelled", async () => {
    votingContract = await setupVotingContract({
      participatingWorkers: [workers[0], workers[1], workers[2]],
    });

    await workers[0].vote(timeframes[0].input, timeframes[0].output);
    const maxVotesToCancel = 1;
    const maxSessionsPerVoteToCancel = 1

    await expect(votingContract.cancelExpiredVotings(maxVotesToCancel, maxSessionsPerVoteToCancel))
      .to.not.emit(votingContract, "VotingSessionExpired")
      .withArgs(timeframes[0].input, timeframes[0].output);
  });

  it("voting which exceeded time limit must not be completed", async () => {
    votingContract = await setupVotingContract({
      participatingWorkers: [workers[0], workers[1], workers[2]],
    });

    await workers[0].vote(timeframes[0].input, timeframes[0].output);

    await timeTravel(2 * DEFAULT_VOTING_TIME_LIMIT);

    // voting canceled
    workers[1].voteExpired(timeframes[0].input, timeframes[0].output);
  });
};
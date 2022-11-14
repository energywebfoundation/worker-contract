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
    ({ votingContract } = await setupVotingContract({
      participatingWorkers: [workers[0], workers[1], workers[2]],
    }));

    await workers[0].vote(timeframes[0].input, timeframes[0].output);

    await timeTravel(2 * DEFAULT_VOTING_TIME_LIMIT);

    await expect(votingContract.cancelExpiredVotings())
      .to.emit(votingContract, "VotingExpired")
      .withArgs(timeframes[0].input);

    await workers[0].vote(timeframes[0].input, timeframes[0].output);
    await workers[1].voteWinning(timeframes[0].input, timeframes[0].output, {
      voteCount: 2,
    });
  });

  it("voting which exceeded time limit must not be completed", async () => {
    ({ votingContract } = await setupVotingContract({
      participatingWorkers: [workers[0], workers[1], workers[2]],
    }));

    await workers[0].vote(timeframes[0].input, timeframes[0].output);

    await timeTravel(2 * DEFAULT_VOTING_TIME_LIMIT);

    // voting canceled and restarted
    workers[1].voteExpired(timeframes[0].input, timeframes[0].output);
    workers[0].voteWinning(timeframes[0].input, timeframes[0].output, {
      voteCount: 2,
    });
  });
};

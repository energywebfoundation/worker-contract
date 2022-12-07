const { expect } = require("chai");
const { itEach } = require("mocha-it-each");
const {
  DEFAULT_REWARD_AMOUNT,
} = require("../../scripts/deploy/deployContracts");

module.exports.consensusTests = function () {
  let diamondAddress;
  let workers;
  let votingContract;
  let timeframes;
  let setupVotingContract;
  let faucet;

  beforeEach(function () {
    ({ workers, timeframes, setupVotingContract, faucet } = this);
  });

  itEach(
    "with ${value.numberOfWorkers} workers and ${value.majority}% majority it should complete after ${value.expectWinAfterVotes} votes",
    [
      { numberOfWorkers: 5, majority: 40, expectWinAfterVotes: 2 },
      { numberOfWorkers: 10, majority: 100, expectWinAfterVotes: 10 },
      { numberOfWorkers: 10, majority: 0, expectWinAfterVotes: 1 },
      { numberOfWorkers: 10, majority: 99, expectWinAfterVotes: 10 },
      { numberOfWorkers: 10, majority: 85, expectWinAfterVotes: 9 },
      { numberOfWorkers: 10, majority: 40, expectWinAfterVotes: 4 },
      { numberOfWorkers: 15, majority: 33, expectWinAfterVotes: 5 },
    ],
    async ({ numberOfWorkers, majority, expectWinAfterVotes }) => {
      const participatingWorkers = workers.slice(0, numberOfWorkers);
      const notWinningWorkers = participatingWorkers.slice(
        0,
        expectWinAfterVotes - 1
      );
      const winningVoteWorker = participatingWorkers[expectWinAfterVotes - 1];

      votingContract = await setupVotingContract({
        participatingWorkers,
        majorityPercentage: majority,
      });

      for (const notWinningWorker of notWinningWorkers) {
        notWinningWorker.voteNotWinning(
          timeframes[0].input,
          timeframes[0].output
        );
      }
      winningVoteWorker.voteWinning(timeframes[0].input, timeframes[0].output, {
        voteCount: expectWinAfterVotes,
      });
    }
  );
};

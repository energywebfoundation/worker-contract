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

      ({ votingContract } = await setupVotingContract({
        participatingWorkers,
        majorityPercentage: majority,
      }));

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

  it("consensus can be reached with simple majority", async () => {
    ({ votingContract } = await setupVotingContract({
      participatingWorkers: [
        workers[0],
        workers[1],
        workers[2],
        workers[3],
        workers[4],
      ],
    }));

    workers[0].voteNotWinning(timeframes[0].input, timeframes[0].output);
    workers[1].voteNotWinning(timeframes[0].input, timeframes[0].output);
    workers[2].voteNotWinning(timeframes[0].input, timeframes[1].output);
    workers[3].voteNotWinning(timeframes[0].input, timeframes[2].output);
    workers[4].voteWinning(timeframes[0].input, timeframes[3].output, {
      voteCount: 2,
      winningOutput: timeframes[0].output,
    });

    // Consensus has been reached
    expect(await votingContract.getMatch(timeframes[0].input)).to.equal(
      timeframes[0].output
    );
  });

  it("consensus can be reached with vast majority", async () => {
    ({ votingContract, diamondAddress } = await setupVotingContract({
      participatingWorkers: [
        workers[0],
        workers[1],
        workers[2],
        workers[3],
        workers[4],
      ],
    }));

    await faucet.sendTransaction({
      to: diamondAddress,
      value: DEFAULT_REWARD_AMOUNT.mul(4), // reward queue balance should be greater than payment
    });

    workers[0].voteNotWinning(timeframes[0].input, timeframes[0].output);
    workers[1].voteNotWinning(timeframes[0].input, timeframes[0].output);

    const balancesBefore = await Promise.all([
      workers[0].wallet.getBalance(),
      workers[1].wallet.getBalance(),
      workers[2].wallet.getBalance(),
      workers[3].wallet.getBalance(),
    ]);

    workers[4].voteWinning(timeframes[0].input, timeframes[0].output, {
      voteCount: 3,
    });

    // Consensus has been reached
    expect(await votingContract.getMatch(timeframes[0].input)).to.equal(
      timeframes[0].output
    );

    const balancesAfter = await Promise.all([
      workers[0].wallet.getBalance(),
      workers[1].wallet.getBalance(),
      workers[2].wallet.getBalance(),
      workers[3].wallet.getBalance(),
    ]);
    const expectedBalances = [
      balancesBefore[0].add(DEFAULT_REWARD_AMOUNT),
      balancesBefore[1].add(DEFAULT_REWARD_AMOUNT),
      balancesBefore[2],
      balancesBefore[3],
    ];
    expect(balancesAfter.every((b, i) => b.eq(expectedBalances[i])));
  });

  it("consensus should not be reached when votes are divided evenly", async () => {
    ({ votingContract } = await setupVotingContract({
      participatingWorkers: [workers[0], workers[1], workers[2], workers[3]],
    }));

    workers[0].voteNotWinning(timeframes[0].input, timeframes[0].output);
    workers[1].voteNotWinning(timeframes[0].input, timeframes[0].output);
    workers[2].voteNotWinning(timeframes[0].input, timeframes[1].output);
    workers[3].voteNoConsensus(timeframes[0].input, timeframes[1].output);

    workers[0].voteNotWinning(timeframes[0].input, timeframes[0].output);
    workers[1].voteNotWinning(timeframes[0].input, timeframes[0].output);
    workers[2].voteWinning(timeframes[0].input, timeframes[0].output, {
      voteCount: 3,
    });
  });
};

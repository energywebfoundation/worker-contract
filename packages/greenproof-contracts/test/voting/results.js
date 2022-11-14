const { expect } = require("chai");
const {
  DEFAULT_REWARD_AMOUNT,
} = require("../../scripts/deploy/deployContracts");

module.exports.resultsTests = function () {
  let workers;
  let votingContract;
  let timeframes;
  let setupVotingContract;
  let faucet;
  let diamondAddress;

  beforeEach(function () {
    ({ workers, timeframes, setupVotingContract, faucet } = this);
  });

  it("should not reveal workers vote before the end of vote", async () => {
    ({ votingContract } = await setupVotingContract({
      majorityPercentage: 100,
      participatingWorkers: [workers[0], workers[1]],
    }));

    await workers[0].voteNotWinning(timeframes[0].input, timeframes[0].output);

    expect(
      await votingContract.getWorkerVote(
        timeframes[0].input,
        workers[0].address
      )
    ).to.equal(ethers.constants.Zero);
  });

  it("should reveal workers vote after the end of vote", async () => {
    ({ votingContract } = await setupVotingContract({
      majorityPercentage: 100,
      participatingWorkers: [workers[0], workers[1]],
    }));

    workers[0].voteNotWinning(timeframes[0].input, timeframes[0].output);
    workers[1].voteWinning(timeframes[0].input, timeframes[0].output, {
      voteCount: 2,
    });

    expect(
      await votingContract.getWorkerVote(
        timeframes[0].input,
        workers[0].address
      )
    ).to.equal(timeframes[0].output);
    expect(
      await votingContract.getWorkerVote(
        timeframes[0].input,
        workers[1].address
      )
    ).to.equal(timeframes[0].output);
  });

  it("should not reveal winners before the end of vote", async () => {
    ({ votingContract } = await setupVotingContract({
      majorityPercentage: 100,
      participatingWorkers: [workers[0], workers[1]],
    }));

    workers[0].voteNotWinning(timeframes[0].input, timeframes[0].output);
    expect(await votingContract.getWinners(timeframes[0].input)).to.be.empty;

    workers[1].voteWinning(timeframes[0].input, timeframes[0].output, {
      voteCount: 2,
    });
    expect(
      await votingContract.getWinners(timeframes[0].input)
    ).to.be.deep.equal([workers[0].address, workers[1].address]);
  });

  it("should not reveal winningMatches before the end of vote", async () => {
    ({ votingContract } = await setupVotingContract({
      participatingWorkers: [workers[0], workers[1], workers[2]],
    }));

    workers[0].voteNotWinning(timeframes[0].input, timeframes[0].output);
    //The vote is not ended, hence we should not get the winngMatch
    expect(await votingContract.getWinningMatch(timeframes[0].input)).to.equal(
      ethers.constants.Zero
    );

    workers[1].voteNotWinning(timeframes[0].input, timeframes[2].output);
    //The vote is still not ended, hence we should not get the winngMatch
    expect(await votingContract.getWinningMatch(timeframes[0].input)).to.equal(
      ethers.constants.Zero
    );

    workers[2].voteWinning(timeframes[0].input, timeframes[0].output, {
      voteCount: 2,
    });
    //The vote ended, hence we should get the winngMatch
    expect(await votingContract.getWinningMatch(timeframes[0].input)).to.equal(
      timeframes[0].output
    );
  });

  it("should get the winner with the most votes", async () => {
    ({ votingContract } = await setupVotingContract({
      participatingWorkers: [workers[0], workers[1], workers[2]],
    }));

    workers[0].voteNotWinning(timeframes[0].input, timeframes[0].output);
    workers[1].voteWinning(timeframes[0].input, timeframes[0].output, {
      voteCount: 2,
    });

    expect(await votingContract.getMatch(timeframes[0].input)).to.equal(
      timeframes[0].output
    );
  });

  it("should emit winning event only once", async () => {
    ({ votingContract } = await setupVotingContract({
      majorityPercentage: 30,
      participatingWorkers: workers,
    }));

    const events = (
      await Promise.all(
        workers.map(async (worker) => {
          const tx = await worker.vote(
            timeframes[0].input,
            timeframes[0].output
          );
          const receipt = await tx.wait();
          return receipt.events;
        })
      )
    ).flat();
    const winningEvents = events
      .filter(Boolean)
      .filter((e) => e.event === "WinningMatch");

    const replayEvents = (
      await Promise.all(
        workers.map(async (worker) => {
          const tx = await worker.vote(
            timeframes[0].input,
            timeframes[1].output
          );
          const receipt = await tx.wait();
          return receipt.events;
        })
      )
    ).flat();
    const winningReplayEvents = replayEvents
      .filter(Boolean)
      .filter((e) => e.event === "WinningMatch");

    expect(winningEvents).to.have.length(1);
    expect(winningReplayEvents).to.have.length(1);
  });

  const REWARD = ethers.utils.parseEther("123");

  it("pays proper reward to the winners", async () => {
    await setupVotingContract({
      reward: REWARD,
      participatingWorkers: [
        workers[0],
        workers[1],
        workers[2],
        workers[3],
        workers[4],
      ],
      rewardPool: REWARD.mul(2),
    });

    workers[0].voteNotWinning(timeframes[0].input, timeframes[0].output);
    workers[1].voteNotWinning(timeframes[0].input, timeframes[0].output);

    await expectToReceiveReward({
      winners: [workers[0], workers[1], workers[4]],
      possiblePayouts: 2,
      operation: () =>
        workers[4].voteWinning(timeframes[0].input, timeframes[0].output, {
          voteCount: 3,
        }),
    });

    expect(await votingContract.getMatch(timeframes[0].input)).to.equal(
      timeframes[0].output
    );
  });

  it("reward should be paid after replenishment of funds", async () => {
    ({ votingContract } = await setupVotingContract({
      reward: REWARD,
      participatingWorkers: [workers[0], workers[1]],
    }));

    workers[0].voteNotWinning(timeframes[0].input, timeframes[0].output);
    workers[1].voteWinning(timeframes[0].input, timeframes[0].output, {
      voteCount: 2,
    });

    await expectToReceiveReward({
      winners: [workers[0], workers[1]],
      possiblePayouts: 2,
      operation: () =>
        votingContract.connect(faucet).replenishRewardPool({
          value: REWARD.mul(2),
        }),
    });
  });

  it("rewards should be paid partially and then fully after charging up the pool", async () => {
    ({ votingContract } = await setupVotingContract({
      reward: REWARD,
      participatingWorkers: [workers[0], workers[1]],
      rewardPool: REWARD,
    }));
    workers[0].voteNotWinning(timeframes[0].input, timeframes[0].output);

    await expectToReceiveReward({
      winners: [workers[0], workers[1]],
      possiblePayouts: 1,
      operation: () =>
        workers[1].voteWinning(timeframes[0].input, timeframes[0].output, {
          voteCount: 2,
        }),
    });

    await expectToReceiveReward({
      winners: [workers[0], workers[1]],
      possiblePayouts: 1,
      operation: () =>
        votingContract.connect(faucet).replenishRewardPool({
          value: REWARD,
        }),
    });
  });

  describe("disabling rewards", function () {
    it("should not pay the winners if rewards are disabled", async () => {
      await setupVotingContract({
        reward: REWARD,
        participatingWorkers: [
          workers[0],
          workers[1],
          workers[2],
          workers[3],
          workers[4],
        ],
        rewardPool: REWARD.mul(5),
        rewardsEnabled: false,
      });

      workers[0].voteNotWinning(timeframes[0].input, timeframes[0].output);
      workers[1].voteNotWinning(timeframes[0].input, timeframes[0].output);

      await expectToReceiveReward({
        winners: [],
        possiblePayouts: 0,
        operation: () =>
          workers[4].voteWinning(timeframes[0].input, timeframes[0].output, {
            voteCount: 3,
          }),
      });

      expect(await votingContract.getMatch(timeframes[0].input)).to.equal(
        timeframes[0].output
      );
    });

    it("should pay the rewards after enabling rewards", async () => {
      ({ diamondAddress } = await setupVotingContract({
        reward: REWARD,
        participatingWorkers: [workers[0], workers[1]],
        rewardPool: REWARD.mul(5),
        rewardsEnabled: false,
      }));

      await workers[0].voteNotWinning(
        timeframes[0].input,
        timeframes[0].output
      );
      await expectToReceiveReward({
        winners: [],
        possiblePayouts: 0,
        operation: () =>
          workers[1].voteWinning(timeframes[0].input, timeframes[0].output, {
            voteCount: 2,
          }),
      });

      const diamondContract = await ethers.getContractAt(
        "Diamond",
        diamondAddress
      );
      const tx = await diamondContract.setRewardsEnabled(true, {
        gasPrice: 10_000_000,
      });
      await tx.wait();

      await workers[0].voteNotWinning(
        timeframes[1].input,
        timeframes[0].output
      );
      await expectToReceiveReward({
        winners: [workers[0], workers[1]],
        possiblePayouts: 2,
        operation: () =>
          workers[1].voteWinning(timeframes[1].input, timeframes[0].output, {
            voteCount: 2,
          }),
      });

      expect(await votingContract.getMatch(timeframes[0].input)).to.equal(
        timeframes[0].output
      );
    });
  });

  const expectToReceiveReward = async ({
    winners = [],
    losers = [],
    // How many workers can be paid with current pool?
    possiblePayouts = winners.length,
    operation,
  }) => {
    const winnersBefore = await Promise.all(winners.map((w) => w.getBalance()));
    const losersBefore = await Promise.all(losers.map((w) => w.getBalance()));

    const result = await operation();
    await result.wait();

    const winnersAfter = await Promise.all(winners.map((w) => w.getBalance()));
    const losersAfter = await Promise.all(losers.map((w) => w.getBalance()));

    const currentWinners = winnersAfter.filter((after, i) =>
      after.gt(winnersBefore[i])
    );
    expect(currentWinners).to.have.length(possiblePayouts);
    expect(losersAfter.every((b, i) => b.lt(losersBefore[i]))).to.be.true;
  };
};

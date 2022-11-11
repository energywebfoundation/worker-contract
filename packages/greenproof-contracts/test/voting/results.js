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

  it("reward should be paid after replenishment of funds", async () => {
    ({ votingContract } = await setupVotingContract({
      participatingWorkers: [workers[0], workers[1]],
    }));

    workers[0].voteNotWinning(timeframes[0].input, timeframes[0].output);
    workers[1].voteWinning(timeframes[0].input, timeframes[0].output, {
      voteCount: 2,
    });

    const balancesBefore = await Promise.all([
      workers[0].wallet.getBalance(),
      workers[1].wallet.getBalance(),
    ]);

    await expect(
      votingContract.connect(faucet).replenishRewardPool({
        value: DEFAULT_REWARD_AMOUNT.mul(3),
      })
    )
      .to.emit(votingContract, "Replenished")
      .withArgs(DEFAULT_REWARD_AMOUNT.mul(3));

    const balancesAfter = await Promise.all([
      workers[0].wallet.getBalance(),
      workers[1].wallet.getBalance(),
    ]);

    expect(
      balancesAfter.every((b, i) =>
        b.eq(balancesBefore[i].add(DEFAULT_REWARD_AMOUNT))
      )
    );
  });
};

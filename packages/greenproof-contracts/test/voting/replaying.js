const { expect } = require("chai");

module.exports.replayingTests = function () {
  let workers;
  let votingContract;
  let timeframes;
  let addWorkers;
  let setupVotingContract;
  let expectResults;

  beforeEach(function () {
    ({ workers, timeframes, addWorkers, setupVotingContract, expectResults } =
      this);
  });

  it("should allow workers to replay the vote", async () => {
    ({votingContract} = await setupVotingContract({
      majorityPercentage: 51,
      participatingWorkers: [workers[0], workers[1]],
    }));

    await workers[0].voteNotWinning(timeframes[0].input, timeframes[0].output);
    //The vote is not ended, hence we should not get the winngMatch
    await expectResults({
      winningMatch: ethers.constants.Zero,
      votingInput: timeframes[0].input,
      workerVotes: {
        0: ethers.constants.Zero,
        1: ethers.constants.Zero,
      },
      winners: [],
    });

    await workers[1].voteWinning(timeframes[0].input, timeframes[0].output, {
      voteCount: 2,
    });

    await expectResults({
      votingInput: timeframes[0].input,
      winningMatch: timeframes[0].output,
      winners: [workers[0].address, workers[1].address],
      workerVotes: {
        0: timeframes[0].output,
        1: timeframes[0].output,
      },
    });

    //No consensus has been reached on replaying: we adding workers[2]
    await addWorkers([workers[2]]);

    //Replaying vote
    await workers[0].voteNotWinning(timeframes[0].input, timeframes[1].output);
    await workers[0].voteAlreadyVoted(
      timeframes[0].input,
      timeframes[1].output
    );
    expect(
      await votingContract.getWorkerVote(
        timeframes[0].input,
        workers[0].address
      )
    ).to.equal(timeframes[0].output);
    expect(await votingContract.getWinningMatch(timeframes[0].input)).to.equal(
      timeframes[0].output
    );

    await workers[1].voteNotWinning(timeframes[0].input, timeframes[4].output);
    await workers[1].voteAlreadyVoted(
      timeframes[0].input,
      timeframes[4].output
    );
    expect(
      await votingContract.getWorkerVote(
        timeframes[0].input,
        workers[1].address
      )
    ).to.equal(timeframes[0].output);
    expect(await votingContract.getWinningMatch(timeframes[0].input)).to.equal(
      timeframes[0].output
    );

    //Worker 3 replays vote like worker 2 : a consensus is reached
    await workers[2].voteWinning(timeframes[0].input, timeframes[4].output, {
      voteCount: 2,
    });

    await expectResults({
      votingInput: timeframes[0].input,
      winningMatch: timeframes[4].output,
      winners: [workers[1].address, workers[2].address],
      workerVotes: {
        0: timeframes[1].output,
        1: timeframes[4].output,
        2: timeframes[4].output,
      },
    });
  });
};

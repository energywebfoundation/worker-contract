const { expect } = require("chai");

module.exports.replayingTests = function () {

  const { initFixture, loadFixture } = this.parent;

  beforeEach(async function () {
    ({
      workers,
      timeframes,
      addWorkers,
      setupVotingContract,
      expectVotingResults,
    } = await loadFixture(initFixture));
  });

  it("should allow workers to replay the vote", async () => {
    votingContract = await setupVotingContract({
      majorityPercentage: 51,
      participatingWorkers: [workers[0], workers[1]],
    });

    await workers[0].voteNotWinning(timeframes[0].input, timeframes[0].output);
    //The vote is not ended, hence we should not get the winngMatch
    await expectVotingResults({
      votingInput: timeframes[0].input,
      winningMatches: [],
      votes: {
        0: [],
        1: [],
      },
      winners: [],
    });

    await workers[1].voteWinning(timeframes[0].input, timeframes[0].output, {
      voteCount: 2,
    });

    await expectVotingResults({
      votingInput: timeframes[0].input,
      winningMatches: [timeframes[0].output],
      votes: {
        0: [timeframes[0].output],
        1: [timeframes[0].output],
      },
      winners: [[workers[0].address, workers[1].address]],
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
      await votingContract.getWorkerVotes(
        timeframes[0].input,
        workers[0].address
      )
    ).to.deep.equal([timeframes[0].output]);
    expect(
      await votingContract.getWinningMatches(timeframes[0].input)
    ).to.deep.equal([timeframes[0].output]);

    await workers[1].voteNotWinning(timeframes[0].input, timeframes[4].output);
    await workers[1].voteAlreadyVoted(
      timeframes[0].input,
      timeframes[4].output
    );
    expect(
      await votingContract.getWorkerVotes(
        timeframes[0].input,
        workers[1].address
      )
    ).to.deep.equal([timeframes[0].output]);
    expect(
      await votingContract.getWinningMatches(timeframes[0].input)
    ).to.deep.equal([timeframes[0].output]);

    //Worker 3 replays vote like worker 2 : a consensus is reached
    await workers[2].voteWinning(timeframes[0].input, timeframes[4].output, {
      voteCount: 2,
    });

    await expectVotingResults({
      votingInput: timeframes[0].input,
      winningMatches: [timeframes[0].output, timeframes[4].output],
      winners: [
        [workers[0].address, workers[1].address],
        [workers[1].address, workers[2].address],
      ],
      votes: {
        0: [timeframes[0].output],
        1: [timeframes[0].output, timeframes[4].output],
        2: [timeframes[4].output],
      },
    });
  });
};

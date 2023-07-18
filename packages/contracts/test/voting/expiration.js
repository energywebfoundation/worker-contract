const { expect } = require("chai");
const { timeTravel } = require("../utils/time.utils");
const {
  DEFAULT_VOTING_TIME_LIMIT,
} = require("../../deploy/utils/constants");

module.exports.expirationTests = function () {
  const { initFixture, loadFixture } = this.parent;

  beforeEach(async function () {
    ({ workers, timeframes, setupVotingContract } = await loadFixture(initFixture));
  });

  it("voting which exceeded time limit can be canceled", async () => {
    const votingContract = await setupVotingContract({
      participatingWorkers: [workers[0], workers[1], workers[2]],
    });

    await workers[0].vote(timeframes[0].input, timeframes[0].output);
    await workers[0].vote(timeframes[0].input, timeframes[1].output);
    await workers[0].vote(timeframes[1].input, timeframes[0].output);
    await workers[0].vote(timeframes[1].input, timeframes[1].output);

    await timeTravel(2 * DEFAULT_VOTING_TIME_LIMIT);
    const maxVotesToCancel = 100;
    const startVotingIndex = 0;
    const startSessionIndex = 0;
    const maxSessionsPerVoteToCancel = 2
    const tx = await votingContract.cancelExpiredVotings(startVotingIndex, maxVotesToCancel, startSessionIndex, maxSessionsPerVoteToCancel);

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
    
    const tx2 = await votingContract.cancelExpiredVotings(startVotingIndex, maxVotesToCancel, startSessionIndex, maxSessionsPerVoteToCancel);

    await expect(tx2).to.not.emit(votingContract, "VotingSessionExpired")
  });

  it("voting which exceeded time limit can be canceled by index", async () => {
    const votingContract = await setupVotingContract({
      participatingWorkers: [workers[0], workers[1], workers[2], workers[3], workers[4], workers[5], workers[6]],
    });

    //session1 -> vote(0, 0)
    await workers[ 0 ].vote(timeframes[ 0 ].input, timeframes[ 0 ].output);
    await workers[ 1 ].vote(timeframes[ 0 ].input, timeframes[ 0 ].output);
    
    //session2 -> vote(0, 1)
    await workers[ 0 ].vote(timeframes[ 0 ].input, timeframes[ 1 ].output);
    
    //session3 -> vote(1, 0)
    await workers[ 0 ].vote(timeframes[ 1 ].input, timeframes[ 0 ].output);
    await workers[ 5 ].vote(timeframes[ 1 ].input, timeframes[ 0 ].output);
    
    //session4 -> vote(1, 1)
    await workers[ 0 ].vote(timeframes[ 1 ].input, timeframes[ 1 ].output);
    
    //session5 -> vote(1, 2)
    await workers[ 2 ].vote(timeframes[ 1 ].input, timeframes[ 2 ].output);
    await workers[ 3 ].vote(timeframes[ 1 ].input, timeframes[ 2 ].output);
    await workers[ 4 ].vote(timeframes[ 1 ].input, timeframes[ 2 ].output);


    await timeTravel(2 * DEFAULT_VOTING_TIME_LIMIT);
    const maxVotesToCancel = 100;
    let startVotingIndex = 1;
    let startSessionIndex = 2;
    const maxSessionsPerVoteToCancel = 10
    let tx = await votingContract.cancelExpiredVotings(startVotingIndex, maxVotesToCancel, startSessionIndex, maxSessionsPerVoteToCancel);

    await expect(tx)
      .to.emit(votingContract, "VotingSessionExpired")
      .withArgs(timeframes[1].input, timeframes[2].output);
    
    tx = await votingContract.cancelExpiredVotings(startVotingIndex, maxVotesToCancel, startSessionIndex, maxSessionsPerVoteToCancel);
    await expect(tx).to.not.emit(votingContract, "VotingSessionExpired")

    //Canceling sessions from 1 index 

    startSessionIndex = 1;
  
    tx = votingContract.cancelExpiredVotings(startVotingIndex, maxVotesToCancel, startSessionIndex, maxSessionsPerVoteToCancel)

    await expect(tx)
      .to.emit(votingContract, "VotingSessionExpired")
      .withArgs(timeframes[ 1 ].input, timeframes[ 1 ].output);
    
    //Canceling from votes index 0 sessions index 1

    startVotingIndex = 0;
    startSessionIndex = 1;
  
    tx = votingContract.cancelExpiredVotings(startVotingIndex, maxVotesToCancel, startSessionIndex, maxSessionsPerVoteToCancel)

    await expect(tx)
      .to.emit(votingContract, "VotingSessionExpired")
      .withArgs(timeframes[ 0 ].input, timeframes[ 1 ].output)
    
    tx = await votingContract.cancelExpiredVotings(startVotingIndex, maxVotesToCancel, startSessionIndex, maxSessionsPerVoteToCancel);
    await expect(tx).to.not.emit(votingContract, "VotingSessionExpired")

     //Canceling from votes index 0 sessions index 0

    startVotingIndex = 0;
    startSessionIndex = 0;
  
    tx = votingContract.cancelExpiredVotings(startVotingIndex, maxVotesToCancel, startSessionIndex, maxSessionsPerVoteToCancel)

    await expect(tx)
      .to.emit(votingContract, "VotingSessionExpired")
      .withArgs(timeframes[ 0 ].input, timeframes[ 0 ].output)
    
    await expect(tx)
      .to.emit(votingContract, "VotingSessionExpired")
      .withArgs(timeframes[ 1 ].input, timeframes[ 0 ].output)
    
    
    tx = await votingContract.cancelExpiredVotings(startVotingIndex, maxVotesToCancel, startSessionIndex, maxSessionsPerVoteToCancel);
    await expect(tx).to.not.emit(votingContract, "VotingSessionExpired")
  });

  it("voting which don't exceeded time limit are not cancelled", async () => {
    const votingContract = await setupVotingContract({
      participatingWorkers: [workers[0], workers[1], workers[2]],
    });

    await workers[0].vote(timeframes[0].input, timeframes[0].output);
    const maxVotesToCancel = 1;
    const startVotingIndex = 0;
    const startSessionIndex = 0;
    const maxSessionsPerVoteToCancel = 1

    await expect(votingContract.cancelExpiredVotings(startVotingIndex, maxVotesToCancel, startSessionIndex, maxSessionsPerVoteToCancel))
      .to.not.emit(votingContract, "VotingSessionExpired")
      .withArgs(timeframes[0].input, timeframes[0].output);
  });

  it("voting which exceeded time limit must not be completed", async () => {
    await setupVotingContract({
      participatingWorkers: [workers[0], workers[1], workers[2]],
    });

    await workers[0].vote(timeframes[0].input, timeframes[0].output);

    await timeTravel(2 * DEFAULT_VOTING_TIME_LIMIT);

    // voting canceled
    workers[1].voteExpired(timeframes[0].input, timeframes[0].output);
  });
};
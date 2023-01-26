const { expect } = require("chai");
const { roles } = require("../utils/roles.utils");
const { timeTravel } = require("../utils/time.utils");
const {
  DEFAULT_VOTING_TIME_LIMIT,
} = require("../../scripts/deploy/deployContracts");

const { workerRole } = roles;

module.exports.permissionsTests = function () {
  let owner;
  let workers;
  let mockClaimManager;
  let votingContract;
  let timeframes;
  let addWorkers;
  let removeWorkers;
  let setupVotingContract;

  beforeEach(function () {
    ({
      owner,
      workers,
      mockClaimManager,
      timeframes,
      addWorkers,
      removeWorkers,
      setupVotingContract,
    } = this);
  });

  it("should allow to vote whitelisted worker", async () => {
    votingContract = await setupVotingContract({
      majorityPercentage: 100,
      participatingWorkers: [workers[0]],
    });

    workers[0].voteWinning(timeframes[0].input, timeframes[0].output, {
      voteCount: 1,
    });

    expect(await workers[0].getVotes(timeframes[0].input)).to.deep.equal([
      timeframes[0].output,
    ]);
    expect(
      await votingContract.getWinningMatches(timeframes[0].input)
    ).to.deep.equal([timeframes[0].output]);
  });

  it("should not allow to vote not whitelisted worker", async () => {
    votingContract = await setupVotingContract({
      majorityPercentage: 100,
      participatingWorkers: [],
    });

    expect(await votingContract.isWhitelistedWorker(workers[0].address)).to.be.false;

    workers[0].voteNotWhitelisted(timeframes[0].input, timeframes[0].output);
  });

  it("should not register a non enrolled worker", async () => {
    votingContract = await setupVotingContract({
      majorityPercentage: 100,
      participatingWorkers: [],
    });

    await mockClaimManager.revokeRole(workers[0].address, workerRole);
    await expect(
      votingContract.addWorker(workers[0].address)
    ).to.be.revertedWith(`NotEnrolledWorker("${workers[0].address}")`);
  });

  it("should revert when we try to remove a not whiteListed worker", async () => {
    votingContract = await setupVotingContract({
      majorityPercentage: 100,
      participatingWorkers: [],
    });

    await mockClaimManager.revokeRole(workers[ 0 ].address, workerRole);
    
    await expect(
      votingContract.connect(owner).removeWorker(workers[0].address)
    ).to.be.revertedWith(`NotWhitelisted("${workers[0].address}")`);
  });

  it("should not allow an enrolled worker to be unregistered", async () => {
    votingContract = await setupVotingContract({
      majorityPercentage: 100,
      participatingWorkers: [workers[0], workers[1]],
    });

    await expect(
      votingContract.connect(owner).removeWorker(workers[0].address)
    ).to.be.revertedWith(`NotRevokedWorker("${workers[0].address}")`);

    await expect(
      votingContract.connect(workers[1].wallet).removeWorker(workers[0].address)
    ).to.be.revertedWith(`NotRevokedWorker("${workers[0].address}")`);
  });

  it("should not be able to add same worker twice", async () => {
    votingContract = await setupVotingContract({
      participatingWorkers: [workers[0]],
    });

    await expect(
      votingContract.addWorker(workers[0].address)
    ).to.be.revertedWith("AlreadyWhitelistedWorker");
  });

  //SIARA

  it("should allow non owner address to add enrolled workers", async () => {
    votingContract = await setupVotingContract();
    await mockClaimManager.grantRole(workers[0].address, workerRole);
    await mockClaimManager.grantRole(workers[1].address, workerRole);
    await mockClaimManager.grantRole(workers[2].address, workerRole);

    await expect(votingContract
      .connect(workers[3].wallet)
      .addWorker(workers[0].address)).to.emit(votingContract, "WorkerAdded");
    await expect(votingContract
      .connect(workers[3].wallet)
      .addWorker(workers[1].address)).to.emit(votingContract, "WorkerAdded");
    await expect(votingContract
      .connect(workers[3].wallet)
      .addWorker(workers[2].address)).to.emit(votingContract, "WorkerAdded");

    expect(await votingContract.isWhitelistedWorker(workers[0].address)).to.equal(true);
    expect(await votingContract.isWhitelistedWorker(workers[1].address)).to.equal(true);
    expect(await votingContract.isWhitelistedWorker(workers[2].address)).to.equal(true);
  });

  it("should allow non owner address to remove not enrolled workers", async () => {
    votingContract = await setupVotingContract();
    await addWorkers([workers[0], workers[1], workers[2]]);

    expect(await votingContract.isWhitelistedWorker(workers[0].address)).to.equal(true);
    expect(await votingContract.isWhitelistedWorker(workers[1].address)).to.equal(true);
    expect(await votingContract.isWhitelistedWorker(workers[2].address)).to.equal(true);

    await removeWorkers([workers[0], workers[1]]);

    expect(await votingContract.isWhitelistedWorker(workers[0].address)).to.equal(false);
    expect(await votingContract.isWhitelistedWorker(workers[1].address)).to.equal(false);
  });

  it("should allow to remove workers and add it again", async () => {
    votingContract = await setupVotingContract();

    await addWorkers([workers[0], workers[1], workers[2]]);
    expect(await votingContract.isWhitelistedWorker(workers[0].address)).to.equal(true);
    expect(await votingContract.isWhitelistedWorker(workers[1].address)).to.equal(true);
    expect(await votingContract.isWhitelistedWorker(workers[2].address)).to.equal(true);

    await removeWorkers([ workers[ 0 ], workers[ 1 ] ]);

    await mockClaimManager.revokeRole(workers[2].address, workerRole);
    
    await expect(votingContract
      .connect(workers[3].wallet)
      .removeWorker(workers[2].address)).to.emit(votingContract, "WorkerRemoved");

    expect(await votingContract.isWhitelistedWorker(workers[0].address)).to.equal(false);
    expect(await votingContract.isWhitelistedWorker(workers[1].address)).to.equal(false);
    expect(await votingContract.isWhitelistedWorker(workers[2].address)).to.equal(false);

    await addWorkers([workers[0], workers[1], workers[2]]);

    expect(await votingContract.isWhitelistedWorker(workers[0].address)).to.equal(true);
    expect(await votingContract.isWhitelistedWorker(workers[1].address)).to.equal(true);
    expect(await votingContract.isWhitelistedWorker(workers[2].address)).to.equal(true);
  });

  it("voting can not be cancelled by non owner", async () => {
    votingContract = await setupVotingContract({
      participatingWorkers: [workers[0], workers[1], workers[2]],
    });

    workers[0].voteNotWinning(timeframes[0].input, timeframes[0].output);

    await timeTravel(2 * DEFAULT_VOTING_TIME_LIMIT);
    const maxVotesToCancel = 1;
    const maxSessionsPerVoteToCancel = 1;

    await expect(
      votingContract.connect(workers[1].wallet).cancelExpiredVotings(maxVotesToCancel, maxSessionsPerVoteToCancel)
    ).to.be.revertedWith(`NotAuthorized("Owner")`);
  });

  it("reverts when non owner tries to cancel expired votings", async () => {
    votingContract = await setupVotingContract({
      participatingWorkers: [workers[0]],
    });

    await votingContract
      .connect(workers[0].wallet)
      .vote(timeframes[0].input, timeframes[0].output);

    await timeTravel(2 * DEFAULT_VOTING_TIME_LIMIT);
    const maxVotesToCancel = 1;
    const maxSessionsPerVoteToCancel = 1;

    await expect(
      votingContract.connect(workers[0].wallet).cancelExpiredVotings(maxVotesToCancel, maxSessionsPerVoteToCancel)
    ).to.be.revertedWith(`NotAuthorized("Owner")`);
  });
};

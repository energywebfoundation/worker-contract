const chai = require("chai");
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { solidity } = require("ethereum-waffle");
const {
  DEFAULT_VOTING_TIME_LIMIT,
  DEFAULT_REWARD_AMOUNT,
  deployDiamond,
} = require("../scripts/deploy/deployContracts");
const { initMockClaimManager } = require("./utils/claimManager.utils");
const { roles } = require("./utils/roles.utils");
const { timeTravel } = require("./utils/time.utils");
const { itEach } = require("mocha-it-each");
const { initMockClaimRevoker } = require("./utils/claimRevocation.utils");

const { workerRole } = roles;
chai.use(solidity);

class Worker {
  static #workerIdCount = 0;
  #workerId;

  constructor(wallet) {
    this.wallet = wallet;
    this.address = wallet.address;
    this.#workerId = Worker.#workerIdCount++;
  }

  getWorkerId() {
    return this.#workerId;
  }

  resetWorkerIds() {
    return (Worker.#workerId = 0);
  }

  setVotingContract(votingContract) {
    this.votingContract = votingContract.connect(this.wallet);
  }

  async vote(input, output) {
    return await this.votingContract.vote(input, output);
  }

  voteNotWinning(input, output) {
    expect(this.votingContract.vote(input, output)).to.not.emit(
      this.votingContract,
      "WinningMatch"
    );
  }

  voteNoConsensus(input, output) {
    expect(this.votingContract.vote(input, output))
      .to.emit(this.votingContract, "NoConsensusReached")
      .withArgs(input);
  }

  voteExpired(input, output) {
    expect(this.votingContract.vote(input, output))
      .to.emit(this.votingContract, "VotingExpired")
      .withArgs(input);
  }

  voteWinning(input, output, { voteCount, winningOutput }) {
    expect(this.votingContract.vote(input, output))
      .to.emit(this.votingContract, "WinningMatch")
      .withArgs(input, winningOutput || output, voteCount);
  }

  voteNotWhitelisted(input, output) {
    expect(this.votingContract.vote(input, output)).to.be.revertedWith(
      "NotWhitelisted"
    );
  }

  voteAlreadyVoted(input, output) {
    expect(this.votingContract.vote(input, output)).to.be.revertedWith(
      "AlreadyVoted()"
    );
  }

  async getVote(input) {
    return await this.votingContract.getWorkerVote(input, this.address);
  }
}

describe("VotingFacet", function () {
  let diamondAddress;
  let owner;
  let workers;
  let faucet;
  let mockClaimManager;
  let mockClaimRevoker;
  let votingContract;

  const timeframes = [
    {
      input: ethers.utils.formatBytes32String("MATCH_INPUT_0"), // 0x4d415443485f494e5055545f3000000000000000000000000000000000000000
      output: ethers.utils.formatBytes32String("MATCH_OUTPUT_0"), // 0x4d415443485f4f55545055545f30000000000000000000000000000000000000
    },
    {
      input: ethers.utils.formatBytes32String("MATCH_INPUT_1"), // 0x4d415443485f494e5055545f3100000000000000000000000000000000000000
      output: ethers.utils.formatBytes32String("MATCH_OUTPUT_1"), // 0x4d415443485f4f55545055545f31000000000000000000000000000000000000
    },
    {
      input: ethers.utils.formatBytes32String("MATCH_INPUT_2"), // 0x4d415443485f494e5055545f3200000000000000000000000000000000000000
      output: ethers.utils.formatBytes32String("MATCH_OUTPUT_2"), // 0x4d415443485f4f55545055545f32000000000000000000000000000000000000
    },
    {
      input: ethers.utils.formatBytes32String("MATCH_INPUT_3"), // 0x4d415443485f494e5055545f3300000000000000000000000000000000000000
      output: ethers.utils.formatBytes32String("MATCH_OUTPUT_3"), // 0x4d415443485f4f55545055545f33000000000000000000000000000000000000
    },
    {
      input: ethers.utils.formatBytes32String("MATCH_INPUT_4"), // 0x4d415443485f494e5055545f3400000000000000000000000000000000000000
      output: ethers.utils.formatBytes32String("MATCH_OUTPUT_4"), // 0x4d415443485f4f55545055545f34000000000000000000000000000000000000
    },
    {
      input: ethers.utils.formatBytes32String("MATCH_INPUT_5"), // 0x4d415443485f494e5055545f3500000000000000000000000000000000000000
      output: ethers.utils.formatBytes32String("MATCH_OUTPUT_5"), // 0x4d415443485f4f55545055545f35000000000000000000000000000000000000
    },
  ];

  beforeEach(async () => {
    const [ownerWallet, faucetWallet, ...workerWallets] =
      await ethers.getSigners();

    mockClaimManager = await initMockClaimManager(ownerWallet);
    mockClaimRevoker = await initMockClaimRevoker(ownerWallet);
    workers = workerWallets.map((w) => new Worker(w));
    faucet = faucetWallet;
    owner = ownerWallet;

    for (let worker of workers) {
      await mockClaimRevoker.isRevoked(workerRole, worker.address, false);
    }
  });

  it("should allow to vote whitelisted worker", async () => {
    await setupVotingContract({
      majorityPercentage: 100,
      participatingWorkers: [workers[0]],
    });

    workers[0].voteWinning(timeframes[0].input, timeframes[0].output, {
      voteCount: 1,
    });

    expect(await workers[0].getVote(timeframes[0].input)).to.equal(
      timeframes[0].output
    );
    expect(await votingContract.getMatch(timeframes[0].input)).to.equal(
      timeframes[0].output
    );
  });

  it("should not reveal workers vote before the end of vote", async () => {
    await setupVotingContract({
      majorityPercentage: 100,
      participatingWorkers: [workers[0], workers[1]],
    });

    await workers[0].voteNotWinning(timeframes[0].input, timeframes[0].output);

    expect(
      await votingContract.getWorkerVote(
        timeframes[0].input,
        workers[0].address
      )
    ).to.equal(ethers.constants.Zero);
  });

  it("should reveal workers vote after the end of vote", async () => {
    await setupVotingContract({
      majorityPercentage: 100,
      participatingWorkers: [workers[0], workers[1]],
    });

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
    await setupVotingContract({
      majorityPercentage: 100,
      participatingWorkers: [workers[0], workers[1]],
    });

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
    await setupVotingContract({
      participatingWorkers: [workers[0], workers[1], workers[2]],
    });

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

  it("should allow workers to replay the vote", async () => {
    await setupVotingContract({
      majorityPercentage: 51,
      participatingWorkers: [workers[0], workers[1]],
    });

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

  it("should not allow to vote not whitelisted worker", async () => {
    await setupVotingContract({
      majorityPercentage: 100,
      participatingWorkers: [],
    });

    expect(await votingContract.isWorker(workers[0].address)).to.be.false;

    workers[0].voteNotWhitelisted(timeframes[0].input, timeframes[0].output);
  });

  it("should not register a non enrolled worker", async () => {
    await setupVotingContract({
      majorityPercentage: 100,
      participatingWorkers: [],
    });

    await mockClaimManager.revokeRole(workers[0].address, workerRole);
    await expect(
      votingContract.addWorker(workers[0].address)
    ).to.be.revertedWith("Access denied: not enrolled as worker");
  });

  it("should revert when we try to remove a not whiteListed worker", async () => {
    await setupVotingContract({
      majorityPercentage: 100,
      participatingWorkers: [],
    });

    await expect(
      votingContract.connect(owner).removeWorker(workers[0].address)
    ).to.be.revertedWith(`WorkerWasNotAdded("${workers[0].address}")`);
  });

  it("should not allow an enrolled worker to unregister", async () => {
    await setupVotingContract({
      majorityPercentage: 100,
      participatingWorkers: [workers[0], workers[1]],
    });

    await expect(
      votingContract.connect(owner).removeWorker(workers[0].address)
    ).to.be.revertedWith("Not allowed: still enrolled as worker");

    await expect(
      votingContract.connect(workers[1].wallet).removeWorker(workers[0].address)
    ).to.be.revertedWith("Not allowed: still enrolled as worker");
  });

  it("should get the winner with the most votes", async () => {
    await setupVotingContract({
      participatingWorkers: [workers[0], workers[1], workers[2]],
    });

    workers[0].voteNotWinning(timeframes[0].input, timeframes[0].output);
    workers[1].voteWinning(timeframes[0].input, timeframes[0].output, {
      voteCount: 2,
    });

    expect(await votingContract.getMatch(timeframes[0].input)).to.equal(
      timeframes[0].output
    );
  });

  it("consensus can be reached with simple majority", async () => {
    await setupVotingContract({
      participatingWorkers: [
        workers[0],
        workers[1],
        workers[2],
        workers[3],
        workers[4],
      ],
    });

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
    await setupVotingContract({
      participatingWorkers: [
        workers[0],
        workers[1],
        workers[2],
        workers[3],
        workers[4],
      ],
    });

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

  it("should not be able to add same worker twice", async () => {
    await setupVotingContract({
      participatingWorkers: [workers[0]],
    });

    await expect(
      votingContract.addWorker(workers[0].address)
    ).to.be.revertedWith("WorkerAlreadyAdded");
  });

  it('should emit winning event only once', async () => {
    await setupVotingContract({
      majorityPercentage: 30,
      participatingWorkers: workers,
    });

    const events = (await Promise.all(workers.map(async worker => {
      const tx = await worker.vote(timeframes[0].input, timeframes[0].output);
      const receipt = await tx.wait();
      return receipt.events;
    }))).flat()
    const winningEvents = events.filter(Boolean).filter(e => e.event === 'WinningMatch')

    const replayEvents = (await Promise.all(workers.map(async worker => {
      const tx = await worker.vote(timeframes[0].input, timeframes[1].output);
      const receipt = await tx.wait();
      return receipt.events;
    }))).flat()
    const winningReplayEvents = replayEvents.filter(Boolean).filter(e => e.event === 'WinningMatch')

    expect(winningEvents).to.have.length(1)
    expect(winningReplayEvents).to.have.length(1)
  });

  it("consensus should not be reached when votes are divided evenly", async () => {
    await setupVotingContract({
      participatingWorkers: [workers[0], workers[1], workers[2], workers[3]],
    });

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

  it("reward should be paid after replenishment of funds", async () => {
    await setupVotingContract({
      participatingWorkers: [workers[0], workers[1]],
    });

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

  it("reverts when non owner tries to cancel expired votings", async () => {
    await setupVotingContract({
      participatingWorkers: [workers[0]],
    });

    await votingContract
      .connect(workers[0].wallet)
      .vote(timeframes[0].input, timeframes[0].output);

    await timeTravel(2 * DEFAULT_VOTING_TIME_LIMIT);

    await expect(
      votingContract.connect(workers[0].wallet).cancelExpiredVotings()
    ).to.be.revertedWith("Greenproof: Voting facet: Only owner allowed");
  });

  it("voting which exceeded time limit can be canceled", async () => {
    await setupVotingContract({
      participatingWorkers: [workers[0], workers[1], workers[2]],
    });

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
    await setupVotingContract({
      participatingWorkers: [workers[0], workers[1], workers[2]],
    });

    await workers[0].vote(timeframes[0].input, timeframes[0].output);

    await timeTravel(2 * DEFAULT_VOTING_TIME_LIMIT);

    // voting canceled and restarted
    workers[1].voteExpired(timeframes[0].input, timeframes[0].output);
    workers[0].voteWinning(timeframes[0].input, timeframes[0].output, {
      voteCount: 2,
    });
  });

  it("voting can not be cancelled by non owner", async () => {
    await setupVotingContract({
      participatingWorkers: [workers[0], workers[1], workers[2]],
    });

    workers[0].voteNotWinning(timeframes[0].input, timeframes[0].output);

    await timeTravel(2 * DEFAULT_VOTING_TIME_LIMIT);

    await expect(
      votingContract.connect(workers[1].wallet).cancelExpiredVotings()
    ).to.be.revertedWith("Greenproof: Voting facet: Only owner allowed");
  });

  it("should allow non owner address to add enrolled workers", async () => {
    await setupVotingContract();
    await mockClaimManager.grantRole(workers[0].address, workerRole);
    await mockClaimManager.grantRole(workers[1].address, workerRole);
    await mockClaimManager.grantRole(workers[2].address, workerRole);

    await votingContract
      .connect(workers[3].wallet)
      .addWorker(workers[0].address);
    await votingContract
      .connect(workers[3].wallet)
      .addWorker(workers[1].address);
    await votingContract
      .connect(workers[3].wallet)
      .addWorker(workers[2].address);

    expect(await votingContract.isWorker(workers[0].address)).to.equal(true);
    expect(await votingContract.isWorker(workers[1].address)).to.equal(true);
    expect(await votingContract.isWorker(workers[2].address)).to.equal(true);
  });

  it("should allow non owner address to remove not enrolled workers", async () => {
    await setupVotingContract();
    await addWorkers([workers[0], workers[1], workers[2]]);

    expect(await votingContract.isWorker(workers[0].address)).to.equal(true);
    expect(await votingContract.isWorker(workers[1].address)).to.equal(true);
    expect(await votingContract.isWorker(workers[2].address)).to.equal(true);

    await removeWorkers([workers[0], workers[1]]);

    expect(await votingContract.isWorker(workers[0].address)).to.equal(false);
    expect(await votingContract.isWorker(workers[1].address)).to.equal(false);
  });

  it("should allow to remove workers and add it again", async () => {
    await setupVotingContract();

    await addWorkers([workers[0], workers[1], workers[2]]);
    expect(await votingContract.isWorker(workers[0].address)).to.equal(true);
    expect(await votingContract.isWorker(workers[1].address)).to.equal(true);
    expect(await votingContract.isWorker(workers[2].address)).to.equal(true);

    await removeWorkers([workers[0], workers[1], workers[2]]);

    expect(await votingContract.isWorker(workers[0].address)).to.equal(false);
    expect(await votingContract.isWorker(workers[1].address)).to.equal(false);
    expect(await votingContract.isWorker(workers[2].address)).to.equal(false);

    await addWorkers([workers[0], workers[1], workers[2]]);

    expect(await votingContract.isWorker(workers[0].address)).to.equal(true);
    expect(await votingContract.isWorker(workers[1].address)).to.equal(true);
    expect(await votingContract.isWorker(workers[2].address)).to.equal(true);
  });

  describe("Majority", () => {
    const testCases = [
      { numberOfWorkers: 5, majority: 40, expectWinAfterVotes: 2 },
      { numberOfWorkers: 10, majority: 100, expectWinAfterVotes: 10 },
      { numberOfWorkers: 10, majority: 0, expectWinAfterVotes: 1 },
      { numberOfWorkers: 10, majority: 99, expectWinAfterVotes: 10 },
      { numberOfWorkers: 10, majority: 85, expectWinAfterVotes: 9 },
      { numberOfWorkers: 10, majority: 40, expectWinAfterVotes: 4 },
      { numberOfWorkers: 15, majority: 33, expectWinAfterVotes: 5 },
    ];

    itEach(
      "with ${value.numberOfWorkers} workers and ${value.majority}% majority it should complete after ${value.expectWinAfterVotes} votes",
      testCases,
      async ({ numberOfWorkers, majority, expectWinAfterVotes }) => {
        const participatingWorkers = workers.slice(0, numberOfWorkers);
        const notWinningWorkers = participatingWorkers.slice(
          0,
          expectWinAfterVotes - 1
        );
        const winningVoteWorker = participatingWorkers[expectWinAfterVotes - 1];

        await setupVotingContract({
          participatingWorkers,
          majorityPercentage: majority,
        });

        for (const notWinningWorker of notWinningWorkers) {
          notWinningWorker.voteNotWinning(
            timeframes[0].input,
            timeframes[0].output
          );
        }
        winningVoteWorker.voteWinning(
          timeframes[0].input,
          timeframes[0].output,
          { voteCount: expectWinAfterVotes }
        );
      }
    );
  });

  const addWorkers = async (workers) => {
    await Promise.all(
      workers.map(async (w) => {
        await mockClaimManager.grantRole(w.address, workerRole);
        await mockClaimRevoker.isRevoked(workerRole, w.address, false);
        await votingContract.addWorker(w.address);
      })
    );
  };

  const expectResults = async ({
    votingInput,
    workerVotes,
    winners,
    winningMatch,
  }) => {
    expect(await votingContract.getWinningMatch(votingInput)).to.equal(
      winningMatch
    );
    for (const [workerIndex, vote] of Object.entries(workerVotes)) {
      const worker = workers[workerIndex];
      const workerVote = await votingContract.getWorkerVote(
        votingInput,
        worker.address
      );
      expect(
        workerVote,
        `expected worker ${worker.getWorkerId()} to vote for ${vote}, but it was ${workerVote}`
      ).to.equal(vote);
    }
    expect(await votingContract.getWinners(votingInput)).to.deep.equal(winners);
  };

  const removeWorkers = async (workers) => {
    await Promise.all(
      workers.map(async (w) => {
        await mockClaimManager.revokeRole(w.address, workerRole);
        await mockClaimRevoker.isRevoked(workerRole, w.address, true);
        await votingContract.removeWorker(w.address);
      })
    );
  };

  const setupVotingContract = async ({
    majorityPercentage,
    participatingWorkers,
  } = {}) => {
    ({ diamondAddress } = await deployDiamond({
      claimManagerAddress: mockClaimManager.address,
      claimRevokerAddress: mockClaimRevoker.address,
      roles,
      majorityPercentage,
    }));
    votingContract = await ethers.getContractAt("VotingFacet", diamondAddress);
    workers.forEach((w) => w.setVotingContract(votingContract));

    await addWorkers(participatingWorkers || []);
  };
});

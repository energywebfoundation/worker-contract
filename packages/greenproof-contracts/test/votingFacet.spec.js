const chai = require('chai');
const { expect } = require('chai');
const { ethers } = require('hardhat');
const { solidity } = require('ethereum-waffle');
const {
  DEFAULT_VOTING_TIME_LIMIT,
  deployDiamond,
} = require('../scripts/deploy/deployContracts');
const { initMockClaimManager } = require('./utils/claimManager');
const { roles } = require('./utils/roles.utils');
const { timeTravel } = require('./utils/time.utils');
const { itEach } = require('mocha-it-each');

const { workerRole } = roles;
chai.use(solidity);

const IS_SETTLEMENT = true;

class Worker {
  constructor(wallet) {
    this.wallet = wallet;
    this.address = wallet.address;
  }

  setVotingContract(votingContract) {
    this.votingContract = votingContract.connect(this.wallet);
  }

  async vote(input, output) {
    await this.votingContract.vote(input, output, IS_SETTLEMENT);
  }

  voteNotWinning(input, output) {
    expect(this.votingContract.vote(input, output,
      IS_SETTLEMENT))
      .to.not.emit(this.votingContract, 'WinningMatch');
  }

  voteNoConsensus(input, output) {
    expect(this.votingContract.vote(input, output, IS_SETTLEMENT))
      .to.emit(this.votingContract, 'NoConsensusReached')
      .withArgs(input);
  }

  voteExpired(input, output) {
    expect(this.votingContract.vote(input, output, IS_SETTLEMENT))
      .to.emit(this.votingContract, 'VotingExpired')
      .withArgs(input);
  }

  voteWinning(input, output, { voteCount, winningOutput }) {
    expect(this.votingContract.vote(input, output, IS_SETTLEMENT))
      .to.emit(this.votingContract, 'WinningMatch')
      .withArgs(input, winningOutput || output, voteCount);
  }

  voteNotWhitelisted(input, output) {
    expect(this.votingContract.vote(input, output, IS_SETTLEMENT))
      .to.be.revertedWith('NotWhitelisted');
  }

  async getVote(input) {
    return await this.votingContract.getWorkerVote(input, this.address);
  }

  async getBalance() {
    return await this.wallet.getBalance();
  }
}

describe('VotingFacet', function() {
  let diamondAddress;
  let owner;
  let workers;
  let faucet;
  let mockClaimManager;
  let votingContract;

  const timeframes = [
    {
      input: ethers.utils.formatBytes32String('MATCH_INPUT_0'),
      output: ethers.utils.formatBytes32String('MATCH_OUTPUT_0'),
    },
    {
      input: ethers.utils.formatBytes32String('MATCH_INPUT_1'),
      output: ethers.utils.formatBytes32String('MATCH_OUTPUT_1'),
    },
    {
      input: ethers.utils.formatBytes32String('MATCH_INPUT_2'),
      output: ethers.utils.formatBytes32String('MATCH_OUTPUT_2'),
    },
    {
      input: ethers.utils.formatBytes32String('MATCH_INPUT_3'),
      output: ethers.utils.formatBytes32String('MATCH_OUTPUT_3'),
    },
    {
      input: ethers.utils.formatBytes32String('MATCH_INPUT_4'),
      output: ethers.utils.formatBytes32String('MATCH_OUTPUT_4'),
    },
    {
      input: ethers.utils.formatBytes32String('MATCH_INPUT_5'),
      output: ethers.utils.formatBytes32String('MATCH_OUTPUT_5'),
    },
  ];

  beforeEach(async () => {
    const [
      ownerWallet,
      faucetWallet,
      ...workerWallets
    ] = await ethers.getSigners();

    mockClaimManager = await initMockClaimManager(ownerWallet);
    workers = workerWallets.map(w => new Worker(w));
    faucet = faucetWallet;
    owner = ownerWallet;
  });

  it('should allow to vote whitelisted worker', async () => {
    await setupVotingContract({
      majorityPercentage: 100,
      participatingWorkers: [workers[0]],
    });

    workers[0].voteWinning(timeframes[0].input, timeframes[0].output, { voteCount: 1 });

    expect(await workers[0].getVote(timeframes[0].input)).to.equal(timeframes[0].output);
    expect(await votingContract.getMatch(timeframes[0].input)).to.equal(timeframes[0].output);
  });

  it('should not reveal workers vote before the end of vote', async () => {
    await setupVotingContract({
      majorityPercentage: 100,
      participatingWorkers: [workers[0], workers[1]],
    });

    await workers[0].voteNotWinning(timeframes[0].input, timeframes[0].output);

    expect(await votingContract.getWorkerVote(timeframes[0].input, workers[0].address)).to.equal(ethers.constants.Zero);
  });

  it('should reveal workers vote after the end of vote', async () => {
    await setupVotingContract({
      majorityPercentage: 100,
      participatingWorkers: [workers[0], workers[1]],
    });

    workers[0].voteNotWinning(timeframes[0].input, timeframes[0].output);
    workers[1].voteWinning(timeframes[0].input, timeframes[0].output, { voteCount: 2 });

    expect(await votingContract.getWorkerVote(timeframes[0].input, workers[0].address)).to.equal(timeframes[0].output);
    expect(await votingContract.getWorkerVote(timeframes[0].input, workers[1].address)).to.equal(timeframes[0].output);
  });

  it('should not reveal winners before the end of vote', async () => {
    await setupVotingContract({
      majorityPercentage: 100,
      participatingWorkers: [workers[0], workers[1]],
    });

    workers[0].voteNotWinning(timeframes[0].input, timeframes[0].output);
    expect(await votingContract.winners(timeframes[0].input)).to.be.empty;

    workers[1].voteWinning(timeframes[0].input, timeframes[0].output, { voteCount: 2 });
    expect(await votingContract.winners(timeframes[0].input)).to.be.deep.equal([workers[0].address, workers[1].address]);
  });

  it('should not reveal winningMatches before the end of vote', async () => {
    await setupVotingContract({
      participatingWorkers: [workers[0], workers[1], workers[2]],
    });

    workers[0].voteNotWinning(timeframes[0].input, timeframes[0].output);
    //The vote is not ended, hence we should not get the winngMatch
    expect(await votingContract.getWinningMatch(timeframes[0].input)).to.equal(ethers.constants.Zero);


    workers[1].voteNotWinning(timeframes[0].input, timeframes[2].output);
    //The vote is still not ended, hence we should not get the winngMatch
    expect(await votingContract.getWinningMatch(timeframes[0].input)).to.equal(ethers.constants.Zero);


    workers[2].voteWinning(timeframes[0].input, timeframes[0].output, { voteCount: 2 });
    //The vote ended, hence we should get the winngMatch
    expect(await votingContract.getWinningMatch(timeframes[0].input)).to.equal(timeframes[0].output);
  });

  it('should allow workers to replay the vote', async () => {
    await setupVotingContract({
      participatingWorkers: [workers[0], workers[1]],
    });

    workers[0].voteNotWinning(timeframes[0].input, timeframes[0].output);
    //The vote is not ended, hence we should not get the winngMatch
    expect(await votingContract.getWinningMatch(timeframes[0].input)).to.equal(ethers.constants.Zero);

    //We check that votes are not released before end of vote
    expect(await votingContract.getWorkerVote(timeframes[0].input, workers[0].address)).to.equal(ethers.constants.Zero);

    expect(await votingContract.getWorkerVote(timeframes[0].input, workers[1].address)).to.equal(ethers.constants.Zero);

    //We check that winners are note shown before end of vote
    expect(await votingContract.winners(timeframes[0].input)).to.be.empty;


    workers[1].voteWinning(timeframes[0].input, timeframes[0].output, { voteCount: 2 });

    expect(await votingContract.getWorkerVote(timeframes[0].input, workers[0].address)).to.equal(timeframes[0].output);

    expect(await votingContract.getWorkerVote(timeframes[0].input, workers[1].address)).to.equal(timeframes[0].output);

    expect(await votingContract.winners(timeframes[0].input)).to.be.deep.equal([workers[0].address, workers[1].address]);

    expect(await votingContract.getMatch(timeframes[0].input)).to.equal(timeframes[0].output);

    //Replaying vote

    //Worker 1 replay a vote

    workers[0].voteNotWinning(timeframes[0].input, timeframes[1].output);

    //We verify that the final vote of worker 1 is not updated
    expect(await votingContract.getWorkerVote(timeframes[0].input, workers[0].address)).to.equal(timeframes[0].output);

    //we verify that the winngMatch has not been updated
    expect(await votingContract.getWinningMatch(timeframes[0].input)).to.equal(timeframes[0].output);

    //worker 2 replays vote

    workers[1].voteNotWinning(timeframes[0].input, timeframes[4].output);

    //We verify that the final vote of worker 2 is not updated
    expect(await votingContract.getWorkerVote(timeframes[0].input, workers[1].address)).to.equal(timeframes[0].output);

    //we verify that the winngMatch has not been updated
    expect(await votingContract.getWinningMatch(timeframes[0].input)).to.equal(timeframes[0].output);

    //No consensus has been reached on replaying: we adding worker2
    await addWorkers([workers[2]]);

    //Worker 3 replays vote like worker 2 : a consensus is reached
    workers[2].voteWinning(timeframes[0].input, timeframes[4].output, { voteCount: 2 });

    //We verify that the final vote for worker 1 is updated
    expect(await votingContract.getWorkerVote(timeframes[0].input, workers[0].address)).to.equal(timeframes[1].output);

    //We verify that the final vote for worker 2 is updated
    expect(await votingContract.getWorkerVote(timeframes[0].input, workers[1].address)).to.equal(timeframes[4].output);

    //We verify that the final vote for worker 3 is updated
    expect(await votingContract.getWorkerVote(timeframes[0].input, workers[2].address)).to.equal(timeframes[4].output);

    //we verify that the winngMatch has correctly been updated
    expect(await votingContract.getWinningMatch(timeframes[0].input)).to.equal(timeframes[4].output);
  });

  it('should not allow to vote not whitelisted worker', async () => {
    await setupVotingContract({
      majorityPercentage: 100,
      participatingWorkers: [],
    });

    expect(await votingContract.isWorker(workers[0].address)).to.be.false;

    workers[0].voteNotWhitelisted(timeframes[0].input, timeframes[0].output);
  });

  it('should not register a non enrolled worker', async () => {
    await setupVotingContract({
      majorityPercentage: 100,
      participatingWorkers: [],
    });

    await mockClaimManager.revokeRole(workers[0].address, workerRole);
    await expect(
      votingContract.addWorker(workers[0].address),
    ).to.be.revertedWith('Access denied: not enrolled as worker');
  });

  it('should revert when we try to remove a not whiteListed worker', async () => {
    await setupVotingContract({
      majorityPercentage: 100,
      participatingWorkers: [],
    });

    await expect(
      votingContract.connect(owner).removeWorker(workers[0].address),
    ).to.be.revertedWith(`WorkerWasNotAdded("${workers[0].address}")`);
  });

  it('should not allow an enrolled worker to unregister', async () => {
    await setupVotingContract({
      majorityPercentage: 100,
      participatingWorkers: [workers[0], workers[1]],
    });

    await expect(
      votingContract.connect(owner).removeWorker(workers[0].address),
    ).to.be.revertedWith('Not allowed: still enrolled as worker');

    await expect(
      votingContract.connect(workers[1].wallet).removeWorker(workers[0].address),
    ).to.be.revertedWith('Not allowed: still enrolled as worker');
  });

  it('should get the winner with the most votes', async () => {
    await setupVotingContract({
      participatingWorkers: [workers[0], workers[1], workers[2]],
    });

    workers[0].voteNotWinning(timeframes[0].input, timeframes[0].output);
    workers[1].voteWinning(timeframes[0].input, timeframes[0].output, { voteCount: 2 });

    expect(await votingContract.getMatch(timeframes[0].input)).to.equal(timeframes[0].output);
    expect(await votingContract.numberOfMatchInputs()).to.equal(1);
  });

  it('consensus can be reached with simple majority', async () => {
    await setupVotingContract({
      participatingWorkers: [workers[0], workers[1], workers[2], workers[3], workers[4]],
    });

    workers[0].voteNotWinning(timeframes[0].input, timeframes[0].output);
    workers[1].voteNotWinning(timeframes[0].input, timeframes[0].output);
    workers[2].voteNotWinning(timeframes[0].input, timeframes[1].output);
    workers[3].voteNotWinning(timeframes[0].input, timeframes[2].output);
    workers[4].voteWinning(
      timeframes[0].input,
      timeframes[3].output,
      { voteCount: 2, winningOutput: timeframes[0].output },
    );

    // Consensus has been reached
    expect(await votingContract.getMatch(timeframes[0].input)).to.equal(timeframes[0].output);
  });

  it('should not be able to add same worker twice', async () => {
    await setupVotingContract({
      participatingWorkers: [workers[0]],
    });

    await expect(votingContract.addWorker(workers[0].address)).to.be.revertedWith(
      'WorkerAlreadyAdded',
    );
  });

  it('consensus should not be reached when votes are divided evenly', async () => {
    await setupVotingContract({
      participatingWorkers: [workers[0], workers[1], workers[2], workers[3]],
    });

    workers[0].voteNotWinning(timeframes[0].input, timeframes[0].output);
    workers[1].voteNotWinning(timeframes[0].input, timeframes[0].output);
    workers[2].voteNotWinning(timeframes[0].input, timeframes[1].output);
    workers[3].voteNoConsensus(timeframes[0].input, timeframes[1].output);

    workers[0].voteNotWinning(timeframes[0].input, timeframes[0].output);
    workers[1].voteNotWinning(timeframes[0].input, timeframes[0].output);
    workers[2].voteWinning(timeframes[0].input, timeframes[0].output, { voteCount: 3 });
  });

  it('voting which exceeded time limit can be canceled', async () => {
    await setupVotingContract({
      participatingWorkers: [workers[0], workers[1], workers[2]],
    });

    await workers[0].vote(timeframes[0].input, timeframes[0].output);

    await timeTravel(2 * DEFAULT_VOTING_TIME_LIMIT);

    await expect(votingContract.cancelExpiredVotings())
      .to.emit(votingContract, 'VotingExpired')
      .withArgs(timeframes[0].input);

    await workers[0].vote(timeframes[0].input, timeframes[0].output);
    await workers[1].voteWinning(timeframes[0].input, timeframes[0].output, { voteCount: 2 });
  });

  it('voting which exceeded time limit must not be completed', async () => {
    await setupVotingContract({
      participatingWorkers: [workers[0], workers[1], workers[2]],
    });

    await workers[0].vote(timeframes[0].input, timeframes[0].output);

    await timeTravel(2 * DEFAULT_VOTING_TIME_LIMIT);

    // voting canceled and restarted
    workers[1].voteExpired(timeframes[0].input, timeframes[0].output);
    workers[0].voteWinning(timeframes[0].input, timeframes[0].output, { voteCount: 2 });
  });

  it('voting can not be cancelled by non owner', async () => {
    await setupVotingContract({
      participatingWorkers: [workers[0], workers[1], workers[2]],
    });

    workers[0].voteNotWinning(timeframes[0].input, timeframes[0].output);

    await timeTravel(2 * DEFAULT_VOTING_TIME_LIMIT);

    await expect(
      votingContract.connect(workers[1].wallet).cancelExpiredVotings(),
    ).to.be.revertedWith('LibDiamond: Must be contract owner');
  });

  it('should allow non owner address to add enrolled workers', async () => {
    await setupVotingContract();
    await mockClaimManager.grantRole(workers[0].address, workerRole);
    await mockClaimManager.grantRole(workers[1].address, workerRole);
    await mockClaimManager.grantRole(workers[2].address, workerRole);

    await votingContract.connect(workers[3].wallet).addWorker(workers[0].address);
    await votingContract.connect(workers[3].wallet).addWorker(workers[1].address);
    await votingContract.connect(workers[3].wallet).addWorker(workers[2].address);

    expect(await votingContract.isWorker(workers[0].address)).to.equal(true);
    expect(await votingContract.isWorker(workers[1].address)).to.equal(true);
    expect(await votingContract.isWorker(workers[2].address)).to.equal(true);
  });

  it('should allow non owner address to remove not enrolled workers', async () => {
    await setupVotingContract();
    await mockClaimManager.grantRole(workers[0].address, workerRole);
    await mockClaimManager.grantRole(workers[1].address, workerRole);
    await mockClaimManager.grantRole(workers[2].address, workerRole);

    await votingContract.addWorker(workers[0].address);
    await votingContract.addWorker(workers[1].address);
    await votingContract.addWorker(workers[2].address);

    expect(await votingContract.isWorker(workers[0].address)).to.equal(true);
    expect(await votingContract.isWorker(workers[1].address)).to.equal(true);
    expect(await votingContract.isWorker(workers[2].address)).to.equal(true);

    await mockClaimManager.revokeRole(workers[0].address, workerRole);
    await mockClaimManager.revokeRole(workers[1].address, workerRole);

    await votingContract.connect(workers[3].wallet).removeWorker(workers[0].address);
    await votingContract.connect(workers[3].wallet).removeWorker(workers[1].address);

    expect(await votingContract.isWorker(workers[0].address)).to.equal(false);
    expect(await votingContract.isWorker(workers[1].address)).to.equal(false);
  });

  it('should allow to remove workers and add it again', async () => {
    await setupVotingContract();
    await mockClaimManager.grantRole(workers[0].address, workerRole);
    await mockClaimManager.grantRole(workers[1].address, workerRole);
    await mockClaimManager.grantRole(workers[2].address, workerRole);

    await votingContract.addWorker(workers[0].address);
    await votingContract.addWorker(workers[1].address);
    await votingContract.addWorker(workers[2].address);

    expect(await votingContract.isWorker(workers[0].address)).to.equal(true);
    expect(await votingContract.isWorker(workers[1].address)).to.equal(true);
    expect(await votingContract.isWorker(workers[2].address)).to.equal(true);

    await mockClaimManager.revokeRole(workers[0].address, workerRole);
    await mockClaimManager.revokeRole(workers[1].address, workerRole);
    await mockClaimManager.revokeRole(workers[2].address, workerRole);

    await votingContract.removeWorker(workers[0].address);
    await votingContract.removeWorker(workers[1].address);
    await votingContract.removeWorker(workers[2].address);

    expect(await votingContract.isWorker(workers[0].address)).to.equal(false);
    expect(await votingContract.isWorker(workers[1].address)).to.equal(false);
    expect(await votingContract.isWorker(workers[2].address)).to.equal(false);

    await mockClaimManager.grantRole(workers[0].address, workerRole);
    await mockClaimManager.grantRole(workers[1].address, workerRole);
    await mockClaimManager.grantRole(workers[2].address, workerRole);

    await votingContract.addWorker(workers[0].address);
    await votingContract.addWorker(workers[1].address);
    await votingContract.addWorker(workers[2].address);

    expect(await votingContract.isWorker(workers[0].address)).to.equal(true);
    expect(await votingContract.isWorker(workers[1].address)).to.equal(true);
    expect(await votingContract.isWorker(workers[2].address)).to.equal(true);
  });

  describe('Majority', () => {
    const testCases = [
      { numberOfWorkers: 5, majority: 40, expectWinAfterVotes: 2 },
      { numberOfWorkers: 10, majority: 100, expectWinAfterVotes: 10 },
      { numberOfWorkers: 10, majority: 0, expectWinAfterVotes: 1 },
      { numberOfWorkers: 10, majority: 99, expectWinAfterVotes: 10 },
      { numberOfWorkers: 10, majority: 85, expectWinAfterVotes: 9 },
      { numberOfWorkers: 10, majority: 40, expectWinAfterVotes: 4 },
      { numberOfWorkers: 15, majority: 33, expectWinAfterVotes: 5 },
    ];

    itEach('with ${value.numberOfWorkers} workers and ${value.majority}% majority it should complete after ${value.expectWinAfterVotes} votes',
      testCases,
      async ({ numberOfWorkers, majority, expectWinAfterVotes }) => {
        const participatingWorkers = workers.slice(0, numberOfWorkers);
        const notWinningWorkers = participatingWorkers.slice(0, expectWinAfterVotes - 1);
        const winningVoteWorker = participatingWorkers[expectWinAfterVotes - 1];

        await setupVotingContract({
          participatingWorkers,
          majorityPercentage: majority,
        });

        for (const notWinningWorker of notWinningWorkers) {
          notWinningWorker.voteNotWinning(timeframes[0].input, timeframes[0].output);
        }
        winningVoteWorker.voteWinning(timeframes[0].input, timeframes[0].output, { voteCount: expectWinAfterVotes });
      });

  });

  describe('Rewards', function() {
    const REWARD = ethers.utils.parseEther('1');

    it('pays proper reward to the winners', async () => {
      await setupVotingContract({
        participatingWorkers: [workers[0], workers[1], workers[2], workers[3], workers[4]],
        rewardPool: REWARD.mul(2),
      });

      workers[0].voteNotWinning(timeframes[0].input, timeframes[0].output);
      workers[1].voteNotWinning(timeframes[0].input, timeframes[0].output);

      await expectToReceiveReward({
        winners: [workers[0], workers[1]],
        losers: [workers[2], workers[3], workers[4]],
        operation: () => workers[4].voteWinning(timeframes[0].input, timeframes[0].output, { voteCount: 3 }),
      });
      expect(await votingContract.getMatch(timeframes[0].input)).to.equal(timeframes[0].output);
    });


    it('reward should be paid after replenishment of funds', async () => {
      await setupVotingContract({
        participatingWorkers: [workers[0], workers[1]],
      });

      workers[0].voteNotWinning(timeframes[0].input, timeframes[0].output);
      workers[1].voteWinning(timeframes[0].input, timeframes[0].output, { voteCount: 2 });

      await expectToReceiveReward({
        winners: [workers[0], workers[1]],
        operation: () => chargeRewardPool(REWARD.mul(2)),
      });
    });


    it('rewards should be paid partially and then fully after charging up the pool', async () => {
      await setupVotingContract({
        participatingWorkers: [workers[0], workers[1]],
        rewardPool: REWARD,
      });
      workers[0].voteNotWinning(timeframes[0].input, timeframes[0].output);

      await expectToReceiveReward({
        winners: [workers[0]],
        operation: () => workers[1].voteWinning(timeframes[0].input, timeframes[0].output, { voteCount: 2 }),
      });

      await expectToReceiveReward({
        winners: [workers[0]],
        operation: () => chargeRewardPool(REWARD),
      });
    });

    const expectToReceiveReward = async ({ winners = [], losers = [], operation, reward }) => {
      const winnersBefore = await Promise.all(winners.map(w => w.getBalance()));
      const losersBefore = await Promise.all(losers.map(w => w.getBalance()));

      await operation();

      const winnersAfter = await Promise.all(winners.map(w => w.getBalance()));
      const losersAfter = await Promise.all(losers.map(w => w.getBalance()));

      expect(winnersAfter.every((b, i) => b.eq(winnersBefore[i] + (reward || REWARD))));
      expect(losersAfter.every((b, i) => b.eq(losersBefore[i])));
    };
  });

  const addWorkers = async (workers) => {
    await Promise.all(workers.map(async w => {
      await mockClaimManager.grantRole(w.address, workerRole);
      await votingContract.addWorker(w.address);
    }));
  };

  const chargeRewardPool = async rewardPool => {
    await faucet.sendTransaction({
      to: diamondAddress,
      value: rewardPool,
    });
  };

  const setupVotingContract = async ({ majorityPercentage, participatingWorkers, rewardPool } = {}) => {
    ({ diamondAddress } = await deployDiamond({
      claimManagerAddress: mockClaimManager.address,
      roles,
      majorityPercentage,
    }));
    votingContract = await ethers.getContractAt('VotingFacet', diamondAddress);
    workers.forEach(w => w.setVotingContract(votingContract));

    if (rewardPool) {
      await chargeRewardPool(rewardPool);
    }

    await addWorkers(participatingWorkers || []);
  };
});

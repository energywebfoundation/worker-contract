const chai = require("chai");
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { solidity } = require("ethereum-waffle");
const { deployDiamond } = require("../../scripts/deploy/deployContracts");
const { initMockClaimManager } = require("../utils/claimManager.utils");
const { roles } = require("../utils/roles.utils");
const { initMockClaimRevoker } = require("../utils/claimRevocation.utils");
const { permissionsTests } = require("./permissions");
const { resultsTests } = require("./results");
const { replayingTests } = require("./replaying");
const { expirationTests } = require("./expiration");
const { consensusTests } = require("./consensus");

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

describe("Voting", function () {
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

  beforeEach(async function () {
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
    Object.assign(this, {
      owner,
      workers,
      faucet,
      mockClaimManager,
      mockClaimRevoker,
      votingContract,
      timeframes,
      addWorkers,
      removeWorkers,
      expectResults,
      setupVotingContract,
    });
  });

  describe("Permissions", permissionsTests);
  describe("Results", resultsTests);

  describe("Replaying", replayingTests);

  describe("Expiration", expirationTests);
  describe("Consensus", consensusTests);

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
    return { votingContract, diamondAddress };
  };
});

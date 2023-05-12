const chai = require("chai");
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { solidity } = require("ethereum-waffle");
const { deployGreenproof } = require("../../scripts/deploy/deployContracts");
const { initMockClaimManager } = require("../utils/claimManager.utils");
const { roles } = require("../utils/roles.utils");
const { initMockClaimRevoker } = require("../utils/claimRevocation.utils");
const { Worker } = require("../utils/worker.utils");
const { permissionsTests } = require("./permissions");
const { resultsTests } = require("./results");
const { replayingTests } = require("./replaying");
const { expirationTests } = require("./expiration");
const { consensusTests } = require("./consensus");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");


const { workerRole } = roles;
chai.use(solidity);

let greenproofAddress;
describe("Voting", function () {
  let owner;
  let workers;
  let faucet;
  let mockClaimManager;
  let mockClaimRevoker;
  let initFixture;

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

  initFixture = async () => {
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

    return {
      owner,
      workers,
      faucet,
      mockClaimManager,
      mockClaimRevoker,
      timeframes,
      addWorkers,
      removeWorkers,
      expectVotingResults,
      setupVotingContract,
    }
  };

  Object.assign(this, { initFixture, loadFixture });

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

  const expectVotingResults = async ({
    votingInput,
    winningMatches,
    votes,
    winners,
  }) => {
    expect(await votingContract.getWinningMatches(votingInput)).to.deep.equal(
      winningMatches
    );

    for (const [workerIndex, workerVotes] of Object.entries(votes)) {
      const worker = workers[workerIndex];
      expect(
        await votingContract.getWorkerVotes(votingInput, worker.address)
      ).to.deep.equal(workerVotes);
    }

    for (const [i, match] of Object.entries(winningMatches)) {
      expect(await votingContract.getWinners(votingInput, match)).to.deep.equal(
        winners[i]
      );
    }
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
    rewardPool,
    reward,
    rewardsEnabled,
  } = {}) => {
    ({ greenproofAddress } = await deployGreenproof({
      claimManagerAddress: mockClaimManager.address,
      claimRevokerAddress: mockClaimRevoker.address,
      roles,
      majorityPercentage,
      rewardAmount: reward,
      rewardsEnabled,
    }));
    module.exports.greenproofAddress = greenproofAddress;
    votingContract = await ethers.getContractAt("VotingFacet", greenproofAddress);
    workers.forEach((w) => w.setVotingContract(votingContract));

    if (rewardsEnabled && rewardPool) {
      await votingContract
        .connect(faucet)
        .replenishRewardPool({ value: rewardPool });
    }

    await addWorkers(participatingWorkers || []);

    return votingContract;
  };
});

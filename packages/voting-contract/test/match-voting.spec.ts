import { ethers, network } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Contract, ContractFactory, utils } from "ethers";
import chai, { expect } from "chai";
import { solidity } from "ethereum-waffle";

chai.use(solidity);
const { parseEther } = utils;

const timeTravel = async (seconds: number) => {
  await network.provider.send("evm_increaseTime", [seconds]);
  await network.provider.send("evm_mine", []);
};

describe("MatchVoting", () => {
  let worker1: SignerWithAddress;
  let worker2: SignerWithAddress;
  let worker3: SignerWithAddress;
  let worker4: SignerWithAddress;
  let worker5: SignerWithAddress;
  let worker6: SignerWithAddress;
  let faucet: SignerWithAddress;
  let MatchVotingContract: ContractFactory;
  let certificateContract: Contract;
  let rewardVoting: Contract;
  let matchVoting: Contract;
  const rewardAmount = parseEther("1");
  const timeLimit = 15 * 60;

  const timeframes = [
    { input: "MATCH_INPUT_1", output: "MATCH_OUTPUT_1" },
    { input: "MATCH_INPUT_2", output: "MATCH_OUTPUT_2" },
    { input: "MATCH_INPUT_3", output: "MATCH_OUTPUT_3" },
    { input: "MATCH_INPUT_4", output: "MATCH_OUTPUT_4" },
    { input: "MATCH_INPUT_5", output: "MATCH_OUTPUT_5" },
  ];

  beforeEach(async () => {
    [, faucet, worker1, worker2, worker3, worker4, worker5, worker6] =
      await ethers.getSigners();
    MatchVotingContract = await ethers.getContractFactory("MatchVoting");
    const CertificateContract = await ethers.getContractFactory("Certificate");
    const certificate = await CertificateContract.deploy();
    certificateContract = await certificate.deployed();
    const RewardVotingFactory = await ethers.getContractFactory("RewardFixed");
    rewardVoting = await RewardVotingFactory.deploy(rewardAmount);
    await rewardVoting.deployed();
    matchVoting = await MatchVotingContract.deploy(
      certificateContract.address,
      rewardVoting.address,
      timeLimit
    );
    await matchVoting.deployed();
    await rewardVoting.setMatchVoting(matchVoting.address);
  });

  it("should allow to vote whitelisted worker", async () => {
    await matchVoting.addWorker(worker1.address);

    expect(
      await matchVoting
        .connect(worker1)
        .vote(timeframes[0].input, timeframes[0].output)
    )
      .to.emit(matchVoting, "WinningMatch")
      .withArgs(timeframes[0].input, timeframes[0].output, 1);
    expect(
      await matchVoting.getWorkerVote(timeframes[0].input, worker1.address)
    ).to.equal(timeframes[0].output);
    expect(await certificateContract.matches(timeframes[0].input)).to.equal(
      timeframes[0].output
    );
  });

  it("should not allow to vote not whitelisted worker", async () => {
    expect(await matchVoting.isWorker(worker1.address)).to.be.false;
    await expect(
      matchVoting
        .connect(worker1)
        .vote(timeframes[0].input, timeframes[0].output)
    ).to.be.revertedWith("NotWhitelisted");
  });

  it("should get the winner with the most votes", async () => {
    await matchVoting.addWorker(worker1.address);
    await matchVoting.addWorker(worker2.address);
    await matchVoting.addWorker(worker3.address);

    await matchVoting
      .connect(worker1)
      .vote(timeframes[0].input, timeframes[0].output);
    expect(
      await matchVoting
        .connect(worker2)
        .vote(timeframes[0].input, timeframes[0].output)
    )
      .to.emit(matchVoting, "WinningMatch")
      .withArgs(timeframes[0].input, timeframes[0].output, 2);

    await expect(
      matchVoting
        .connect(worker3)
        .vote(timeframes[0].input, timeframes[1].output)
    ).to.be.revertedWith("VotingAlreadyEnded");

    expect(await certificateContract.matches(timeframes[0].input)).to.equal(
      timeframes[0].output
    );
    expect(await matchVoting.numberOfMatchInputs()).to.equal(1);
  });

  it("consensus can be reached with simple majority", async () => {
    await matchVoting.addWorker(worker1.address);
    await matchVoting.addWorker(worker2.address);
    await matchVoting.addWorker(worker3.address);
    await matchVoting.addWorker(worker4.address);
    await matchVoting.addWorker(worker5.address);

    await matchVoting
      .connect(worker1)
      .vote(timeframes[0].input, timeframes[0].output);
    await matchVoting
      .connect(worker2)
      .vote(timeframes[0].input, timeframes[0].output);
    await matchVoting
      .connect(worker3)
      .vote(timeframes[0].input, timeframes[1].output);
    await matchVoting
      .connect(worker4)
      .vote(timeframes[0].input, timeframes[2].output);
    await expect(
      matchVoting
        .connect(worker5)
        .vote(timeframes[0].input, timeframes[3].output)
    )
      .to.emit(matchVoting, "WinningMatch")
      .withArgs(timeframes[0].input, timeframes[0].output, 2);

    // Consensus has been reached
    expect(await certificateContract.matches(timeframes[0].input)).to.equal(
      timeframes[0].output
    );
  });

  it("consensus can be reached with vast majority", async () => {
    await matchVoting.addWorker(worker1.address);
    await matchVoting.addWorker(worker2.address);
    await matchVoting.addWorker(worker3.address);
    await matchVoting.addWorker(worker4.address);
    await matchVoting.addWorker(worker5.address);
    await faucet.sendTransaction({
      to: rewardVoting.address,
      value: rewardAmount.mul(4), // reward queue balance should be greater then payment
    });
    const nonWinnerBalanceBefore = await worker3.getBalance();

    await matchVoting
      .connect(worker1)
      .vote(timeframes[0].input, timeframes[0].output);
    await matchVoting
      .connect(worker2)
      .vote(timeframes[0].input, timeframes[0].output);

    const balancesBefore = await Promise.all([
      worker1.getBalance(),
      worker2.getBalance(),
      worker3.getBalance(),
      worker4.getBalance(),
    ]);

    await expect(
      matchVoting
        .connect(worker5)
        .vote(timeframes[0].input, timeframes[0].output)
    )
      .to.emit(matchVoting, "WinningMatch")
      .withArgs(timeframes[0].input, timeframes[0].output, 3);

    // Consensus has been reached
    expect(await certificateContract.matches(timeframes[0].input)).to.equal(
      timeframes[0].output
    );

    const balancesAfter = await Promise.all([
      worker1.getBalance(),
      worker2.getBalance(),
      worker3.getBalance(),
      worker4.getBalance(),
    ]);
    const expectedBalances = [
      balancesBefore[0].add(rewardAmount),
      balancesBefore[1].add(rewardAmount),
      balancesBefore[2],
      balancesBefore[3],
    ];
    expect(balancesAfter.every((b, i) => b.eq(expectedBalances[i])));
  });

  it("should not be able to add same worker twice", async () => {
    await matchVoting.addWorker(worker1.address);

    await expect(matchVoting.addWorker(worker1.address)).to.be.revertedWith(
      "WorkerAlreadyAdded"
    );
  });

  it("consensus should not be reached when votes are divided evenly", async () => {
    await matchVoting.addWorker(worker1.address);
    await matchVoting.addWorker(worker2.address);
    await matchVoting.addWorker(worker3.address);
    await matchVoting.addWorker(worker4.address);

    await matchVoting
      .connect(worker1)
      .vote(timeframes[0].input, timeframes[0].output);
    await matchVoting
      .connect(worker2)
      .vote(timeframes[0].input, timeframes[0].output);
    await matchVoting
      .connect(worker3)
      .vote(timeframes[0].input, timeframes[1].output);

    await expect(
      matchVoting
        .connect(worker4)
        .vote(timeframes[0].input, timeframes[1].output)
    )
      .to.emit(matchVoting, "NoConsensusReached")
      .withArgs(timeframes[0].input);

    await matchVoting
      .connect(worker1)
      .vote(timeframes[0].input, timeframes[0].output);
    await matchVoting
      .connect(worker2)
      .vote(timeframes[0].input, timeframes[0].output);
    await expect(
      matchVoting
        .connect(worker3)
        .vote(timeframes[0].input, timeframes[0].output)
    ).to.emit(matchVoting, "WinningMatch");
  });

  it("reward should be paid after replenishment of funds", async () => {
    await matchVoting.addWorker(worker1.address);
    await matchVoting.addWorker(worker2.address);

    await matchVoting
      .connect(worker1)
      .vote(timeframes[0].input, timeframes[0].output);
    await matchVoting
      .connect(worker2)
      .vote(timeframes[0].input, timeframes[0].output);

    const balancesBefore = await Promise.all([
      worker1.getBalance(),
      worker2.getBalance(),
    ]);

    await faucet.sendTransaction({
      to: rewardVoting.address,
      value: rewardAmount.mul(3),
    });

    const balancesAfter = await Promise.all([
      worker1.getBalance(),
      worker2.getBalance(),
    ]);

    expect(
      balancesAfter.every((b, i) => b.eq(balancesBefore[i].add(rewardAmount)))
    );
  });

  it("voting which exceeded time limit can be canceled", async () => {
    await matchVoting.addWorker(worker1.address);
    await matchVoting.addWorker(worker2.address);
    await matchVoting.addWorker(worker3.address);

    await matchVoting
      .connect(worker1)
      .vote(timeframes[0].input, timeframes[0].output);

    await timeTravel(2 * timeLimit);

    await expect(matchVoting.cancelLongrunningVotings())
      .to.emit(matchVoting, "VotingExpired")
      .withArgs(timeframes[0].input);

    await matchVoting
      .connect(worker1)
      .vote(timeframes[0].input, timeframes[0].output);
    await expect(
      matchVoting
        .connect(worker2)
        .vote(timeframes[0].input, timeframes[0].output)
    ).to.emit(matchVoting, "WinningMatch");
  });

  it("voting which exceeded time limit must not be completed", async () => {
    await matchVoting.addWorker(worker1.address);
    await matchVoting.addWorker(worker2.address);
    await matchVoting.addWorker(worker3.address);

    await matchVoting
      .connect(worker1)
      .vote(timeframes[0].input, timeframes[0].output);

    await timeTravel(2 * timeLimit);

    // voting canceled and restarted
    await expect(
      matchVoting
        .connect(worker2)
        .vote(timeframes[0].input, timeframes[0].output)
    )
      .to.emit(matchVoting, "VotingExpired")
      .withArgs(timeframes[0].input);

    await expect(
      matchVoting
        .connect(worker1)
        .vote(timeframes[0].input, timeframes[0].output)
    ).to.emit(matchVoting, "WinningMatch");
  });
});

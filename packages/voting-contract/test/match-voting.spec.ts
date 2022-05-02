import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Contract, ContractFactory } from "ethers";
import { expect } from "chai";

describe("MatchVoting", () => {
  let worker1: SignerWithAddress;
  let worker2: SignerWithAddress;
  let worker3: SignerWithAddress;
  let worker4: SignerWithAddress;
  let worker5: SignerWithAddress;
  let MatchVotingContract: ContractFactory;
  let certificateContract: Contract;

  const timeframes = [
    { input: "MATCH_INPUT_1", output: "MATCH_OUTPUT_1" },
    { input: "MATCH_INPUT_2", output: "MATCH_OUTPUT_2" },
    { input: "MATCH_INPUT_3", output: "MATCH_OUTPUT_3" },
    { input: "MATCH_INPUT_4", output: "MATCH_OUTPUT_4" },
    { input: "MATCH_INPUT_5", output: "MATCH_OUTPUT_5" },
  ];

  const timestamp = new Date().getTime();

  beforeEach(async () => {
    [, worker1, worker2, worker3, worker4, worker5] = await ethers.getSigners();
    MatchVotingContract = await ethers.getContractFactory("MatchVoting");
    const CertificateContract = await ethers.getContractFactory("Certificate");
    const certificate = await CertificateContract.deploy();
    certificateContract = await certificate.deployed();
  });

  it("should allow to vote whitelisted worker", async () => {
    const matchVoting = await MatchVotingContract.deploy(
      certificateContract.address
    );
    await matchVoting.deployed();
    await matchVoting.addWorker(worker1.address);

    await matchVoting
      .connect(worker1)
      .vote(timeframes[0].input, timeframes[0].output);

    await expect(matchVoting.getWinningMatch(timeframes[0].input))
      .to.emit(matchVoting, "WinningMatch")
      .withArgs(timeframes[0].input, timeframes[0].output, 1);
    expect(await certificateContract.matches(timeframes[0].input)).to.equal(
      timeframes[0].output
    );
  });

  it("should not allow to vote not whitelisted worker", async () => {
    const matchVoting = await MatchVotingContract.deploy(
      certificateContract.address
    );
    await matchVoting.deployed();

    await expect(
      matchVoting
        .connect(worker1)
        .vote(timeframes[0].input, timeframes[0].output)
    ).to.be.revertedWith("AlreadyVotedOrNotWhitelisted");
  });

  it("should get the winner with the most votes", async () => {
    const matchVoting = await MatchVotingContract.deploy(
      certificateContract.address
    );
    await matchVoting.deployed();
    await matchVoting.addWorker(worker1.address);
    await matchVoting.addWorker(worker2.address);
    await matchVoting.addWorker(worker3.address);

    await matchVoting
      .connect(worker1)
      .vote(timeframes[0].input, timeframes[0].output);
    await matchVoting
      .connect(worker2)
      .vote(timeframes[0].input, timeframes[0].output);
    await matchVoting
      .connect(worker3)
      .vote(timeframes[0].input, timeframes[1].output);

    await expect(matchVoting.getWinningMatch(timeframes[0].input))
      .to.emit(matchVoting, "WinningMatch")
      .withArgs(timeframes[0].input, timeframes[0].output, 2);
    expect(await certificateContract.matches(timeframes[0].input)).to.equal(
      timeframes[0].output
    );
  });

  it("should not allow to get winner if no votes yet", async () => {
    const matchVoting = await MatchVotingContract.deploy(
      certificateContract.address
    );
    await matchVoting.deployed();

    await expect(
      matchVoting.getWinningMatch(timeframes[0].input)
    ).to.be.revertedWith("NoVotesYet");
  });

  it("should not reach consensus if winning match has less than 50% of votes ", async () => {
    const matchVoting = await MatchVotingContract.deploy(
      certificateContract.address
    );
    await matchVoting.deployed();
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
    await matchVoting
      .connect(worker5)
      .vote(timeframes[0].input, timeframes[3].output);

    await expect(
      matchVoting.getWinningMatch(timeframes[0].input)
    ).to.be.revertedWith("NoConsensusReached");
  });
});

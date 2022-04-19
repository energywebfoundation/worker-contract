import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ContractFactory } from "ethers";
import { expect } from "chai";

describe("MatchVoting", () => {
  let worker1: SignerWithAddress;
  let worker2: SignerWithAddress;
  let worker3: SignerWithAddress;
  let MatchVotingContract: ContractFactory;
  const validMatchResult = "VALID_MATCH_RESULT";
  const invalidMatchResult = "INVALID_MATCH_RESULT";
  const timestamp = new Date().getTime();

  beforeEach(async () => {
    [, worker1, worker2, worker3] = await ethers.getSigners();
    MatchVotingContract = await ethers.getContractFactory("MatchVoting");
  });

  it("should allow to vote whitelisted worker", async () => {
    const matchVoting = await MatchVotingContract.deploy(
      getAddresses([worker1]),
      timestamp
    );
    await matchVoting.deployed();

    await matchVoting.connect(worker1).vote(validMatchResult);

    await expect(matchVoting.getWinningMatch())
      .to.emit(matchVoting, "WinningMatch")
      .withArgs(validMatchResult, timestamp, 1);
  });

  it("should not allow to vote not whitelisted worker", async () => {
    const matchVoting = await MatchVotingContract.deploy(
      getAddresses([worker1]),
      timestamp
    );
    await matchVoting.deployed();

    await expect(
      matchVoting.connect(worker2).vote(validMatchResult)
    ).to.be.revertedWith("AlreadyVotedOrNotWhitelisted");
  });

  it("should get the winner with the most votes", async () => {
    const matchVoting = await MatchVotingContract.deploy(
      getAddresses([worker1, worker2, worker3]),
      timestamp
    );
    await matchVoting.deployed();

    await matchVoting.connect(worker1).vote(invalidMatchResult);
    await matchVoting.connect(worker2).vote(validMatchResult);
    await matchVoting.connect(worker3).vote(validMatchResult);

    await expect(matchVoting.getWinningMatch())
      .to.emit(matchVoting, "WinningMatch")
      .withArgs(validMatchResult, timestamp, 2);
  });

  it("should not allow to vote second time", async () => {
    const matchVoting = await MatchVotingContract.deploy(
      getAddresses([worker1, worker2, worker3]),
      timestamp
    );
    await matchVoting.deployed();

    await matchVoting.connect(worker1).vote(invalidMatchResult);

    await expect(
      matchVoting.connect(worker1).vote(validMatchResult)
    ).to.be.revertedWith("AlreadyVotedOrNotWhitelisted");
  });

  it("should not allow to get winner if no votes yet", async () => {
    const matchVoting = await MatchVotingContract.deploy(
      getAddresses([worker1, worker2, worker3]),
      timestamp
    );
    await matchVoting.deployed();

    await expect(matchVoting.getWinningMatch()).to.be.revertedWith(
      "NoVotesYet"
    );
  });

  const getAddresses = (signers: SignerWithAddress[]) =>
    signers.map((signer) => signer.address);
});

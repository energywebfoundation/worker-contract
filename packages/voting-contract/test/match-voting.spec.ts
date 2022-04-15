import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ContractFactory } from "ethers";
import { expect } from "chai";

describe("MatchVoting", () => {
  let owner: SignerWithAddress;
  let worker1: SignerWithAddress;
  let worker2: SignerWithAddress;
  let worker3: SignerWithAddress;
  let MatchVotingContract: ContractFactory;
  const validMatchResult = "VALID_MATCH_RESULT";
  const invalidMatchResult = "INVALID_MATCH_RESULT";

  beforeEach(async () => {
    [owner, worker1, worker2, worker3] = await ethers.getSigners();
    MatchVotingContract = await ethers.getContractFactory("MatchVoting");
  });

  it("should allow to vote whitelisted worker", async () => {
    const matchVoting = await MatchVotingContract.deploy(
      getAddresses([worker1])
    );
    await matchVoting.deployed();

    await matchVoting.connect(worker1).vote(validMatchResult);

    expect(await matchVoting.getWinner()).to.equal(validMatchResult);
  });

  it("should not allow to vote not whitelisted worker", async () => {
    const matchVoting = await MatchVotingContract.deploy(
      getAddresses([worker1])
    );
    await matchVoting.deployed();

    await expect(
      matchVoting.connect(worker2).vote(validMatchResult)
    ).to.be.revertedWith("Already voted or not whitelisted");
  });

  it("should get the winner with the most votes", async () => {
    const matchVoting = await MatchVotingContract.deploy(
      getAddresses([worker1, worker2, worker3])
    );
    await matchVoting.deployed();

    await matchVoting.connect(worker1).vote(invalidMatchResult);
    await matchVoting.connect(worker2).vote(validMatchResult);
    await matchVoting.connect(worker3).vote(validMatchResult);

    expect(await matchVoting.getWinner()).to.equal(validMatchResult);
  });

  it("should not allow to vote second time", async () => {
    const matchVoting = await MatchVotingContract.deploy(
      getAddresses([worker1, worker2, worker3])
    );
    await matchVoting.deployed();

    await matchVoting.connect(worker1).vote(invalidMatchResult);

    await expect(
      matchVoting.connect(worker1).vote(validMatchResult)
    ).to.be.revertedWith("Already voted or not whitelisted");
  });

  const getAddresses = (signers: SignerWithAddress[]) =>
    signers.map((signer) => signer.address);
});

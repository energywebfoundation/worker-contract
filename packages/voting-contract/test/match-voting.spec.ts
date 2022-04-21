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
  const MATCH_1 = "MATCH_1";
  const MATCH_2 = "MATCH_2";
  const MATCH_3 = "MATCH_3";
  const MATCH_4 = "MATCH_4";
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
      getAddresses([worker1]),
      timestamp,
      certificateContract.address
    );
    await matchVoting.deployed();

    await matchVoting.connect(worker1).vote(MATCH_1);

    await expect(matchVoting.getWinningMatch())
      .to.emit(matchVoting, "WinningMatch")
      .withArgs(MATCH_1, timestamp, 1);
    expect(await certificateContract.matchResults(0)).to.equal(MATCH_1);
  });

  it("should not allow to vote not whitelisted worker", async () => {
    const matchVoting = await MatchVotingContract.deploy(
      getAddresses([worker1]),
      timestamp,
      certificateContract.address
    );
    await matchVoting.deployed();

    await expect(matchVoting.connect(worker2).vote(MATCH_1)).to.be.revertedWith(
      "AlreadyVotedOrNotWhitelisted"
    );
  });

  it("should get the winner with the most votes", async () => {
    const matchVoting = await MatchVotingContract.deploy(
      getAddresses([worker1, worker2, worker3]),
      timestamp,
      certificateContract.address
    );
    await matchVoting.deployed();

    await matchVoting.connect(worker1).vote(MATCH_2);
    await matchVoting.connect(worker2).vote(MATCH_1);
    await matchVoting.connect(worker3).vote(MATCH_1);

    await expect(matchVoting.getWinningMatch())
      .to.emit(matchVoting, "WinningMatch")
      .withArgs(MATCH_1, timestamp, 2);
    expect(await certificateContract.matchResults(0)).to.equal(MATCH_1);
  });

  it("should not allow to vote second time", async () => {
    const matchVoting = await MatchVotingContract.deploy(
      getAddresses([worker1, worker2, worker3]),
      timestamp,
      certificateContract.address
    );
    await matchVoting.deployed();

    await matchVoting.connect(worker1).vote(MATCH_2);

    await expect(matchVoting.connect(worker1).vote(MATCH_1)).to.be.revertedWith(
      "AlreadyVotedOrNotWhitelisted"
    );
  });

  it("should not allow to get winner if no votes yet", async () => {
    const matchVoting = await MatchVotingContract.deploy(
      getAddresses([worker1, worker2, worker3]),
      timestamp,
      certificateContract.address
    );
    await matchVoting.deployed();

    await expect(matchVoting.getWinningMatch()).to.be.revertedWith(
      "NoVotesYet"
    );
  });

  it("should not reach consensus if winning match has less than 50% of votes ", async () => {
    const matchVoting = await MatchVotingContract.deploy(
      getAddresses([worker1, worker2, worker3, worker4, worker5]),
      timestamp,
      certificateContract.address
    );
    await matchVoting.deployed();

    await matchVoting.connect(worker1).vote(MATCH_1);
    await matchVoting.connect(worker2).vote(MATCH_2);
    await matchVoting.connect(worker3).vote(MATCH_3);
    await matchVoting.connect(worker4).vote(MATCH_4);
    await matchVoting.connect(worker5).vote(MATCH_4);

    await expect(matchVoting.getWinningMatch()).to.be.revertedWith(
      "NoConsensusReached"
    );
  });

  const getAddresses = (signers: SignerWithAddress[]) =>
    signers.map((signer) => signer.address);
});

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
  let worker6: SignerWithAddress;
  let MatchVotingContract: ContractFactory;
  let certificateContract: Contract;
  let matchVoting: Contract;

  const timeframes = [
    { input: "MATCH_INPUT_1", output: "MATCH_OUTPUT_1" },
    { input: "MATCH_INPUT_2", output: "MATCH_OUTPUT_2" },
    { input: "MATCH_INPUT_3", output: "MATCH_OUTPUT_3" },
    { input: "MATCH_INPUT_4", output: "MATCH_OUTPUT_4" },
    { input: "MATCH_INPUT_5", output: "MATCH_OUTPUT_5" },
  ];

  beforeEach(async () => {
    [, worker1, worker2, worker3, worker4, worker5, worker6] =
      await ethers.getSigners();
    MatchVotingContract = await ethers.getContractFactory("MatchVoting");
    const CertificateContract = await ethers.getContractFactory("Certificate");
    const certificate = await CertificateContract.deploy();
    certificateContract = await certificate.deployed();
    matchVoting = await MatchVotingContract.deploy(certificateContract.address);
    await matchVoting.deployed();
  });

  it("should allow to vote whitelisted worker", async () => {
    await matchVoting.addWorker(worker1.address);

    expect(
      await matchVoting
        .connect(worker1)
        .vote(timeframes[0].input, timeframes[0].output)
    )
      .to.emit(matchVoting, "WinningMatch")
      .withArgs(timeframes[0].input, timeframes[0].output, 2);
    expect(
      await matchVoting.getWorkerVote(timeframes[0].input, worker1.address)
    ).to.equal(timeframes[0].output);
    expect(await certificateContract.matches(timeframes[0].input)).to.equal(
      timeframes[0].output
    );
  });

  it("should not allow to vote not whitelisted worker", async () => {
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
    expect(
      await matchVoting
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

    await matchVoting
      .connect(worker1)
      .vote(timeframes[0].input, timeframes[0].output);
    await matchVoting
      .connect(worker2)
      .vote(timeframes[0].input, timeframes[0].output);
    expect(
      await matchVoting
        .connect(worker5)
        .vote(timeframes[0].input, timeframes[0].output)
    )
      .to.emit(matchVoting, "WinningMatch")
      .withArgs(timeframes[0].input, timeframes[0].output, 2);

    // Consensus has been reached
    expect(await certificateContract.matches(timeframes[0].input)).to.equal(
      timeframes[0].output
    );
  });

  it("should not be able to add same worker twice", async () => {
    await matchVoting.addWorker(worker1.address);

    expect(matchVoting.addWorker(worker1.address)).to.be.revertedWith(
      "WorkerAlreadyAdded"
    );
  });

  it("consensus should not be reached when votes are divided equally", async () => {
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

    expect(
      await matchVoting
        .connect(worker4)
        .vote(timeframes[0].input, timeframes[1].output)
    )
      .to.emit(matchVoting, "VotingRestarted")
      .withArgs(timeframes[0].input);

    await matchVoting
      .connect(worker1)
      .vote(timeframes[0].input, timeframes[0].output);
    await matchVoting
      .connect(worker2)
      .vote(timeframes[0].input, timeframes[0].output);
    expect(
      await matchVoting
        .connect(worker3)
        .vote(timeframes[0].input, timeframes[0].output)
    ).to.emit(matchVoting, "WinngingMatch");
  });
});

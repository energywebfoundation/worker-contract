import { ethers, network } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Contract, ContractFactory, utils } from "ethers";
import chai, { expect } from "chai";
import { deployMockContract, MockContract, solidity } from "ethereum-waffle";
import { claimManagerInterface, toBytes32 } from "./utils";

chai.use(solidity);
const { parseEther } = utils;

const timeTravel = async (seconds: number) => {
  await network.provider.send("evm_increaseTime", [seconds]);
  await network.provider.send("evm_mine", []);
};

describe("MatchVoting", () => {
  let owner: SignerWithAddress;
  let worker1: SignerWithAddress;
  let worker2: SignerWithAddress;
  let worker3: SignerWithAddress;
  let worker4: SignerWithAddress;
  let worker5: SignerWithAddress;
  let worker6: SignerWithAddress;
  let faucet: SignerWithAddress;
  let toRemoveWorker: SignerWithAddress;
  let notEnrolledWorker: SignerWithAddress;
  let MatchVotingContract: ContractFactory;
  let claimManagerMocked: MockContract;

  let certificateContract: Contract;
  let rewardVoting: Contract;
  let matchVoting: Contract;
  const rewardAmount = parseEther("1");
  const timeLimit = 15 * 60;
  const workerRoleDef = utils.namehash("worker.roles.247.apps.qb.iam.ewc");
  const defaultRoleVersion = 1;

  const timeframes = [
    { input: "MATCH_INPUT_1", output: toBytes32("MATCH_OUTPUT_1") },
    { input: "MATCH_INPUT_1", output: toBytes32("REPLAYED_MATCH_OUTPUT_1") },
    { input: "MATCH_INPUT_2", output: toBytes32("MATCH_OUTPUT_2") },
    { input: "MATCH_INPUT_3", output: toBytes32("MATCH_OUTPUT_3") },
    { input: "MATCH_INPUT_4", output: toBytes32("MATCH_OUTPUT_4") },
    { input: "MATCH_INPUT_5", output: toBytes32("MATCH_OUTPUT_5") },
  ];

  beforeEach(async () => {
    [
      owner,
      faucet,
      worker1,
      worker2,
      worker3,
      worker4,
      worker5,
      worker6,
      notEnrolledWorker,
      toRemoveWorker,
    ] = await ethers.getSigners();
    MatchVotingContract = await ethers.getContractFactory("MatchVoting");
    const CertificateContract = await ethers.getContractFactory("Certificate");
    const certificate = await CertificateContract.deploy();
    certificateContract = await certificate.deployed();
    const RewardVotingFactory = await ethers.getContractFactory("RewardFixed");
    rewardVoting = await RewardVotingFactory.deploy(rewardAmount);
    await rewardVoting.deployed();

    //  Mocking claimManager
    claimManagerMocked = await deployMockContract(owner, claimManagerInterface);

    //  Granting worker role for workers in mocked claimManager
    const allowedWorkers = [
      worker1,
      worker2,
      worker3,
      worker4,
      worker5,
      worker6,
      toRemoveWorker,
    ];

    await Promise.all(
      allowedWorkers.map(async (currentWorker) => {
        await claimManagerMocked.mock.hasRole
          .withArgs(currentWorker.address, workerRoleDef, defaultRoleVersion)
          .returns(true);
      })
    );

    matchVoting = await MatchVotingContract.deploy(
      certificateContract.address,
      rewardVoting.address,
      timeLimit,
      claimManagerMocked.address,
      workerRoleDef
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

  it("should not reveal workers vote before the end of vote", async () => {
    await matchVoting.addWorker(worker1.address);
    await matchVoting.addWorker(worker2.address);
    

    expect(
      await matchVoting
        .connect(worker1)
        .vote(timeframes[0].input, timeframes[0].output)
    )
    
    expect(
      await matchVoting.getWorkerVote(timeframes[0].input, worker1.address)
    ).to.equal(ethers.constants.Zero);
  });

  it("should reveal workers vote after the end of vote", async () => {
    await matchVoting.addWorker(worker1.address);
    await matchVoting.addWorker(worker2.address);
    

    expect(
      await matchVoting
        .connect(worker1)
        .vote(timeframes[0].input, timeframes[0].output)
    );
    
    expect(
      await matchVoting.getWorkerVote(timeframes[0].input, worker1.address)
    ).to.equal(ethers.constants.Zero);

    await expect(
      matchVoting
        .connect(worker2)
        .vote(timeframes[0].input, timeframes[0].output)
    ).to.emit(matchVoting, "WinningMatch")
      .withArgs(timeframes[0].input, timeframes[0].output, 2);
    
    expect(
      await matchVoting.getWorkerVote(timeframes[0].input, worker1.address)
    ).to.equal(timeframes[0].output);
  });

   it("should not reveal winners before the end of vote", async () => {
    await matchVoting.addWorker(worker1.address);
    await matchVoting.addWorker(worker2.address);

     expect(
       await matchVoting
         .connect(worker1)
         .vote(timeframes[0].input, timeframes[0].output)
     );
    
    expect(
      await matchVoting.winners(timeframes[0].input)
    ).to.be.empty;
     
     await expect(
      matchVoting
        .connect(worker2)
        .vote(timeframes[0].input, timeframes[0].output)
    )
      .to.emit(matchVoting, "WinningMatch")
       .withArgs(timeframes[0].input, timeframes[0].output, 2);
     
    expect(
      await matchVoting.winners(timeframes[0].input)
    ).to.be.deep.equal([worker1.address, worker2.address]);
   });
  
  it("should not reveal winningMatches before the end of vote", async () => {
    await matchVoting.addWorker(worker1.address);
    await matchVoting.addWorker(worker2.address);
    await matchVoting.addWorker(worker3.address);

    await expect(
      matchVoting
        .connect(worker1)
        .vote(timeframes[0].input, timeframes[0].output)
    ).to.not.emit(matchVoting, "WinningMatch");
    
    //The vote is not ended, hence we should not get the winngMatch
    expect(
      await matchVoting.getWinningMatch(timeframes[0].input)
    ).to.equal(ethers.constants.Zero);

    await expect(
      matchVoting
        .connect(worker2)
        .vote(timeframes[0].input, timeframes[2].output)
    ).to.not.emit(matchVoting, "WinningMatch");

    //The vote is still not ended, hence we should not get the winngMatch
    expect(
      await matchVoting.getWinningMatch(timeframes[0].input)
    ).to.equal(ethers.constants.Zero);

    await expect(
      matchVoting
        .connect(worker3)
        .vote(timeframes[0].input, timeframes[0].output)
    ).to.emit(matchVoting, "WinningMatch")
      .withArgs(timeframes[0].input, timeframes[0].output, 2);
    
    //The vote ended, hence we should get the winngMatch
    expect(
      await matchVoting.getWinningMatch(timeframes[0].input)
    ).to.equal(timeframes[0].output);
  });

  it("should allow workers to replay the vote", async () => {
    await matchVoting.addWorker(worker1.address);
    await matchVoting.addWorker(worker2.address);

    expect(
      await matchVoting
        .connect(worker1)
        .vote(timeframes[0].input, timeframes[0].output)
    ).to.not.emit(matchVoting, "WinningMatch");

    //The vote is not ended, hence we should not get the winngMatch
    expect(
      await matchVoting.getWinningMatch(timeframes[0].input)
    ).to.equal(ethers.constants.Zero);

    //We check that votes are not released before end of vote
    expect(
      await matchVoting.getWorkerVote(timeframes[0].input, worker1.address)
    ).to.equal(ethers.constants.Zero);
    
    expect(
      await matchVoting.getWorkerVote(timeframes[0].input, worker2.address)
    ).to.equal(ethers.constants.Zero);

    //We check that winners are note shown before end of vote
    expect(
      await matchVoting.winners(timeframes[0].input)
    ).to.be.empty;
    
    await expect(
      matchVoting
        .connect(worker2)
        .vote(timeframes[0].input, timeframes[0].output)
    )
      .to.emit(matchVoting, "WinningMatch")
      .withArgs(timeframes[0].input, timeframes[0].output, 2);
    
    expect(
      await matchVoting.getWorkerVote(timeframes[0].input, worker1.address)
    ).to.equal(timeframes[0].output);

    expect(
      await matchVoting.getWorkerVote(timeframes[0].input, worker2.address)
    ).to.equal(timeframes[0].output);

    expect(
      await matchVoting.winners(timeframes[0].input)
    ).to.be.deep.equal([worker1.address, worker2.address]);
    
    expect(await certificateContract.matches(timeframes[0].input)).to.equal(
      timeframes[0].output
    );

    //Replaying vote

    //Worker 1 replay a vote
    expect(
      await matchVoting
        .connect(worker1)
        .vote(timeframes[0].input, timeframes[1].output)
    );

    //We verify that the final vote of worker 1 is not updated
    expect(
      await matchVoting.getWorkerVote(timeframes[0].input, worker1.address)
    ).to.equal(timeframes[0].output);

    //we verify that the winngMatch has not been updated
    expect(
      await matchVoting.getWinningMatch(timeframes[0].input)
    ).to.equal(timeframes[0].output);

    //worker 2 replays vote
    expect(
      await matchVoting
        .connect(worker2)
        .vote(timeframes[0].input, timeframes[4].output)
    );

    //We verify that the final vote of worker 2 is not updated
    expect(
      await matchVoting.getWorkerVote(timeframes[0].input, worker2.address)
    ).to.equal(timeframes[0].output);

     //we verify that the winngMatch has not been updated
    expect(
      await matchVoting.getWinningMatch(timeframes[0].input)
    ).to.equal(timeframes[0].output);

    //No consensus has been reached on replaying: we adding worker3
    await matchVoting.addWorker(worker3.address);

    //Worker 3 replays vote like worker 2 : a consensus is reached
    await expect(
        matchVoting
        .connect(worker3)
        .vote(timeframes[0].input, timeframes[4].output)
    )
    .to.emit(matchVoting, "WinningMatch")
      .withArgs(timeframes[0].input, timeframes[4].output, 2);
    
    //We verify that the final vote for worker 1 is updated
     expect(
      await matchVoting.getWorkerVote(timeframes[0].input, worker1.address)
     ).to.equal(timeframes[1].output);
    
    //We verify that the final vote for worker 2 is updated
     expect(
      await matchVoting.getWorkerVote(timeframes[0].input, worker2.address)
     ).to.equal(timeframes[4].output);
    
    //We verify that the final vote for worker 3 is updated
     expect(
      await matchVoting.getWorkerVote(timeframes[0].input, worker3.address)
     ).to.equal(timeframes[4].output);
    
    //we verify that the winngMatch has correctly been updated
    expect(
      await matchVoting.getWinningMatch(timeframes[0].input)
    ).to.equal(timeframes[4].output);
  });

  it("should not allow to vote not whitelisted worker", async () => {
    expect(await matchVoting.isWorker(worker1.address)).to.be.false;
    await expect(
      matchVoting
        .connect(worker1)
        .vote(timeframes[0].input, timeframes[0].output)
    ).to.be.revertedWith("NotWhitelisted");
  });

  it("should not register a non enrolled worker", async () => {
    await claimManagerMocked.mock.hasRole
      .withArgs(notEnrolledWorker.address, workerRoleDef, defaultRoleVersion)
      .returns(false);

    await expect(
      matchVoting.addWorker(notEnrolledWorker.address)
    ).to.be.revertedWith("Access denied: not enrolled as worker");
  });

  it("should not allow an enrolled worker to unregister", async () => {
    await claimManagerMocked.mock.hasRole
      .withArgs(toRemoveWorker.address, workerRoleDef, defaultRoleVersion)
      .returns(true);

    // Register a worker
    await matchVoting.connect(owner).addWorker(toRemoveWorker.address);

    await expect(
      matchVoting.connect(owner).removeWorker(toRemoveWorker.address)
    ).to.be.revertedWith("Not allowed: still enrolled as worker");
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

    await expect(matchVoting.cancelExpiredVotings())
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

  it("voting can not be cancelled by non owner", async () => {
    await matchVoting.addWorker(worker1.address);
    await matchVoting.addWorker(worker2.address);
    await matchVoting.addWorker(worker3.address);

    await matchVoting
      .connect(worker1)
      .vote(timeframes[0].input, timeframes[0].output);

    await timeTravel(2 * timeLimit);

    await expect(
      matchVoting.connect(worker2).cancelExpiredVotings()
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("should allow to remove workers and add it again", async () => {
    await matchVoting.addWorker(worker1.address);
    await matchVoting.addWorker(worker2.address);
    await matchVoting.addWorker(worker3.address);

    expect(await matchVoting.isWorker(worker1.address)).to.equal(true);
    expect(await matchVoting.isWorker(worker2.address)).to.equal(true);
    expect(await matchVoting.isWorker(worker3.address)).to.equal(true);

    await Promise.all(
      [worker1.address, worker2.address, worker3.address].map(async (a) => {
        await claimManagerMocked.mock.hasRole
          .withArgs(a, workerRoleDef, defaultRoleVersion)
          .returns(false);
      })
    );

    await matchVoting.removeWorker(worker1.address);
    await matchVoting.removeWorker(worker2.address);
    await matchVoting.removeWorker(worker3.address);
    expect(await matchVoting.isWorker(worker1.address)).to.equal(false);
    expect(await matchVoting.isWorker(worker2.address)).to.equal(false);
    expect(await matchVoting.isWorker(worker3.address)).to.equal(false);

    await Promise.all(
      [worker1.address, worker2.address, worker3.address].map(async (a) => {
        await claimManagerMocked.mock.hasRole
          .withArgs(a, workerRoleDef, defaultRoleVersion)
          .returns(true);
      })
    );

    await matchVoting.addWorker(worker1.address);
    await matchVoting.addWorker(worker2.address);
    await matchVoting.addWorker(worker3.address);
    expect(await matchVoting.isWorker(worker1.address)).to.equal(true);
    expect(await matchVoting.isWorker(worker2.address)).to.equal(true);
    expect(await matchVoting.isWorker(worker3.address)).to.equal(true);
  });
});

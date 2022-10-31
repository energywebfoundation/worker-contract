const chai = require("chai");
const { expect } = require("chai");
const { parseEther } = require("ethers").utils;
const { ethers, network } = require("hardhat");
const { solidity, deployMockContract } = require("ethereum-waffle");
const { deployDiamond } = require("../scripts/deploy");
const { claimManagerInterface, claimRevocationInterface } = require("./utils");

const issuerRole = ethers.utils.namehash(
  "minter.roles.greenproof.apps.iam.ewc"
);
const revokerRole = ethers.utils.namehash(
  "revoker.roles.greenproof.apps.iam.ewc"
);
const workerRole = ethers.utils.namehash(
  "workerRole.roles.greenproof.apps.iam.ewc"
);


chai.use(solidity);

const timeTravel = async (seconds) => {
    await network.provider.send("evm_increaseTime", [ seconds ]);
    await network.provider.send("evm_mine", []);
};

describe("VotingFacet", function () {
    let diamondAddress;
    let grantRole;
    let revokeRole;

    let owner;
    let worker1;
    let worker2;
    let worker3;
    let worker4;
    let worker5;
    let toRemoveWorker;
    let notEnrolledWorker;
    let faucet;
    let matchVoting;

    const rewardAmount = parseEther("1");
    const timeLimit = 15 * 60;
    const defaultVersion = 1;
    const timeframes = [
        { input: ethers.utils.formatBytes32String("MATCH_INPUT_1"), output: ethers.utils.formatBytes32String("MATCH_OUTPUT_1") },
        { input: ethers.utils.formatBytes32String("MATCH_INPUT_1"), output: ethers.utils.formatBytes32String("REPLAYED_MATCH_OUTPUT_1") },
        { input: ethers.utils.formatBytes32String("MATCH_INPUT_2"), output: ethers.utils.formatBytes32String("MATCH_OUTPUT_2") },
        { input: ethers.utils.formatBytes32String("MATCH_INPUT_3"), output: ethers.utils.formatBytes32String("MATCH_OUTPUT_3") },
        { input: ethers.utils.formatBytes32String("MATCH_INPUT_4"), output: ethers.utils.formatBytes32String("MATCH_OUTPUT_4") },
        { input: ethers.utils.formatBytes32String("MATCH_INPUT_5"), output: ethers.utils.formatBytes32String("MATCH_OUTPUT_5") },
    ];

    beforeEach(async () => {
        console.log(`\n`);
        console.log("inputMatch : ", timeframes[0].input)
        const [_owner] = await ethers.getSigners();

        //  Mocking claimManager
        const claimManagerMocked = await deployMockContract(
            _owner,
            claimManagerInterface
        );

        //  Mocking claimsRevocationRegistry
       const claimsRevocationRegistryMocked = await deployMockContract(
            _owner,
            claimRevocationInterface
        );

        grantRole = async (operatorWallet, role) => {
            await claimManagerMocked.mock.hasRole
                .withArgs(operatorWallet.address, role, defaultVersion)
                .returns(true);
            
            await claimsRevocationRegistryMocked.mock.isRevoked
                .withArgs(role, operatorWallet.address)
                .returns(false);
        };

        revokeRole = async (operatorWallet, role) => {
            await claimManagerMocked.mock.hasRole
                .withArgs(operatorWallet.address, role, defaultVersion)
                .returns(true);
            
            await claimsRevocationRegistryMocked.mock.isRevoked
                .withArgs(role, operatorWallet.address)
                .returns(true);
        };

        const roles = {
            issuerRole,
            revokerRole,
            workerRole,
        };

        diamondAddress = await deployDiamond(
            timeLimit,
            rewardAmount,
            claimManagerMocked.address,
            claimsRevocationRegistryMocked.address,
            roles
        );
        diamondCutFacet = await ethers.getContractAt(
            "DiamondCutFacet",
            diamondAddress
        );
        diamondLoupeFacet = await ethers.getContractAt(
            "DiamondLoupeFacet",
            diamondAddress
        );
        ownershipFacet = await ethers.getContractAt(
            "OwnershipFacet",
            diamondAddress
        );
        issuerFacet = await ethers.getContractAt("IssuerFacet", diamondAddress);
        matchVoting = await ethers.getContractAt("VotingFacet", diamondAddress);
        [
            owner,
            faucet,
            worker1,
            worker2,
            worker3,
            worker4,
            worker5,
            notEnrolledWorker,
            nonWorker,
            toRemoveWorker,
        ] = await ethers.getSigners();
        counter = 0;
    });

    it("should allow to vote whitelisted worker", async () => {
        await grantRole(worker1, workerRole);
        await matchVoting.addWorker(worker1.address);
        await expect(
             matchVoting
                .connect(worker1)
                .vote(timeframes[ 0 ].input, timeframes[ 0 ].output)
        )
            .to.emit(matchVoting, "WinningMatch")
                .withArgs(timeframes[ 0 ].input, timeframes[ 0 ].output, 1);

        expect(
            await matchVoting.getWorkerVote(timeframes[ 0 ].input, worker1.address)
        ).to.equal(timeframes[ 0 ].output);

        expect(await matchVoting.getMatch(timeframes[ 0 ].input)).to.equal(
            timeframes[ 0 ].output
        );
    });

    it("should not reveal workers vote before the end of vote", async () => {
        await grantRole(worker1, workerRole);
        await grantRole(worker2, workerRole);
    
        await matchVoting.addWorker(worker1.address);
        await matchVoting.addWorker(worker2.address);

        await expect(
            matchVoting
                .connect(worker1)
                .vote(timeframes[0].input, timeframes[0].output)
        ).to.not.emit(matchVoting, "WinningMatch");
        
        expect(
            await matchVoting.getWorkerVote(timeframes[0].input, worker1.address)
        ).to.equal(ethers.constants.Zero);
    });
    
    it("should reveal workers vote after the end of vote", async () => {
        await grantRole(worker1, workerRole);
        await grantRole(worker2, workerRole);

        await matchVoting.addWorker(worker1.address);
        await matchVoting.addWorker(worker2.address);

        await expect(
            matchVoting
                .connect(worker1)
                .vote(timeframes[0].input, timeframes[0].output)
        ).to.not.emit(matchVoting, "WinningMatch");
        
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
        await grantRole(worker1, workerRole);
        await grantRole(worker2, workerRole);

        await matchVoting.addWorker(worker1.address);
        await matchVoting.addWorker(worker2.address);

        await expect(
            matchVoting
                .connect(worker1)
                .vote(timeframes[0].input, timeframes[0].output)
        ).to.not.emit(matchVoting, "WinningMatch");

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
        await grantRole(worker1, workerRole);
        await grantRole(worker2, workerRole);
        await grantRole(worker3, workerRole);

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
        await grantRole(worker1, workerRole);
        await grantRole(worker2, workerRole);
        await grantRole(worker3, workerRole);
        
        await matchVoting.addWorker(worker1.address);
        await matchVoting.addWorker(worker2.address);

        await expect(
            matchVoting
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

        //We check that winners are not shown before end of vote
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
        
        expect(await matchVoting.getMatch(timeframes[0].input)).to.equal(
            timeframes[0].output
        );

        //Replaying vote

        //Worker 1 replay a vote
        await expect(
            matchVoting
                .connect(worker1)
                .vote(timeframes[0].input, timeframes[1].output)
        ).to.not.emit(matchVoting, "WinningMatch");
        
        // We verify that workers cannot pump the same re-vote
        await expect(
            matchVoting
                .connect(worker1)
                .vote(timeframes[0].input, timeframes[1].output)
        ).to.be.revertedWith("AlreadyVoted()")

        //We verify that the final vote of worker 1 is not updated
        expect(
            await matchVoting.getWorkerVote(timeframes[0].input, worker1.address)
        ).to.equal(timeframes[0].output);

        //we verify that the winngMatch has not been updated
        expect(
            await matchVoting.getWinningMatch(timeframes[0].input)
        ).to.equal(timeframes[0].output);

        //worker 2 replays vote
        await expect(
            matchVoting
                .connect(worker2)
                .vote(timeframes[0].input, timeframes[4].output)
        ).to.not.emit(matchVoting, "WinningMatch");

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
        ).to.emit(matchVoting, "WinningMatch")
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
        
        expect(await matchVoting.isWorker(nonWorker.address)).to.be.false;
        await expect(
            matchVoting
                .connect(nonWorker)
                .vote(timeframes[ 0 ].input, timeframes[ 0 ].output)
        ).to.be.revertedWith("NotWhitelisted");
    });

    it("should not register a non enrolled worker", async () => {
        await revokeRole(notEnrolledWorker, workerRole);

        await expect(
            matchVoting.addWorker(notEnrolledWorker.address)
        ).to.be.revertedWith("Access denied: not enrolled as worker");
    });

    it("should revert when we try to remove a not whiteListed worker", async () => {
        await expect(
            matchVoting.connect(owner).removeWorker(toRemoveWorker.address)
        ).to.be.revertedWith(`WorkerWasNotAdded("${toRemoveWorker.address}")`);
    });

    it("should not allow an enrolled worker to unregister", async () => {
        await grantRole(toRemoveWorker, workerRole);
        await grantRole(worker1, workerRole);

        // Register a worker
        await matchVoting.connect(owner).addWorker(toRemoveWorker.address);
        await matchVoting.connect(owner).addWorker(worker1.address);

        await expect(
            matchVoting.connect(owner).removeWorker(toRemoveWorker.address)
        ).to.be.revertedWith("Not allowed: still enrolled as worker");

        await expect(
            matchVoting.connect(worker4).removeWorker(worker1.address)
        ).to.be.revertedWith("Not allowed: still enrolled as worker");
    });

    it("should get the winner with the most votes", async () => {
        await grantRole(worker1, workerRole);
        await grantRole(worker2, workerRole);
        await grantRole(worker3, workerRole);
        
        await matchVoting.addWorker(worker1.address);
        await matchVoting.addWorker(worker2.address);
        await matchVoting.addWorker(worker3.address);

        await expect(
            matchVoting
                .connect(worker1)
                .vote(timeframes[ 0 ].input, timeframes[ 0 ].output)
        ).to.not.emit(matchVoting, "WinningMatch");
        
        await expect(
            matchVoting
                .connect(worker2)
                .vote(timeframes[ 0 ].input, timeframes[ 0 ].output)
        )
        .to.emit(matchVoting, "WinningMatch")
            .withArgs(timeframes[ 0 ].input, timeframes[ 0 ].output, 2);

        expect(await matchVoting.getMatch(timeframes[ 0 ].input)).to.equal(
            timeframes[ 0 ].output
        );
        expect(await matchVoting.numberOfvotingSessions()).to.equal(1);
    });

    it("consensus can be reached with simple majority", async () => {
        await grantRole(worker1, workerRole);
        await grantRole(worker2, workerRole);
        await grantRole(worker3, workerRole);
        await grantRole(worker4, workerRole);
        await grantRole(worker5, workerRole);
        
        await matchVoting.addWorker(worker1.address);
        await matchVoting.addWorker(worker2.address);
        await matchVoting.addWorker(worker3.address);
        await matchVoting.addWorker(worker4.address);
        await matchVoting.addWorker(worker5.address);

        await expect(
            matchVoting
                .connect(worker1)
                .vote(timeframes[ 0 ].input, timeframes[ 0 ].output)
            ).to.not.emit(matchVoting, "WinningMatch");

        await expect(
            matchVoting
                .connect(worker2)
                .vote(timeframes[ 0 ].input, timeframes[ 0 ].output)
            ).to.not.emit(matchVoting, "WinningMatch");

        await expect(
            matchVoting
                .connect(worker3)
                .vote(timeframes[ 0 ].input, timeframes[ 1 ].output)
            ).to.not.emit(matchVoting, "WinningMatch");

        await expect(
            matchVoting
                .connect(worker4)
                .vote(timeframes[ 0 ].input, timeframes[ 2 ].output)
            ).to.not.emit(matchVoting, "WinningMatch");

        await expect(
            matchVoting
                .connect(worker5)
                .vote(timeframes[ 0 ].input, timeframes[ 3 ].output)
            )
            .to.emit(matchVoting, "WinningMatch")
                .withArgs(timeframes[ 0 ].input, timeframes[ 0 ].output, 2);

        // Consensus has been reached
        expect(await matchVoting.getMatch(timeframes[ 0 ].input)).to.equal(
            timeframes[ 0 ].output
        );
    });

    it("consensus can be reached with vast majority", async () => {
        await grantRole(worker1, workerRole);
        await grantRole(worker2, workerRole);
        await grantRole(worker3, workerRole);
        await grantRole(worker4, workerRole);
        await grantRole(worker5, workerRole);
        
        await matchVoting.addWorker(worker1.address);
        await matchVoting.addWorker(worker2.address);
        await matchVoting.addWorker(worker3.address);
        await matchVoting.addWorker(worker4.address);
        await matchVoting.addWorker(worker5.address);

        await faucet.sendTransaction({
            to: diamondAddress,
            value: rewardAmount.mul(4), // reward queue balance should be greater than payment
        });

        await matchVoting
            .connect(worker1)
            .vote(timeframes[ 0 ].input, timeframes[ 0 ].output);
        await matchVoting
            .connect(worker2)
            .vote(timeframes[ 0 ].input, timeframes[ 0 ].output);

        const balancesBefore = await Promise.all([
            worker1.getBalance(),
            worker2.getBalance(),
            worker3.getBalance(),
            worker4.getBalance(),
        ]);

        await expect(
            matchVoting
                .connect(worker5)
                .vote(timeframes[ 0 ].input, timeframes[ 0 ].output)
        )
            .to.emit(matchVoting, "WinningMatch")
            .withArgs(timeframes[ 0 ].input, timeframes[ 0 ].output, 3);

        // Consensus has been reached
        expect(await matchVoting.getMatch(timeframes[ 0 ].input)).to.equal(
            timeframes[ 0 ].output
        );

        const balancesAfter = await Promise.all([
            worker1.getBalance(),
            worker2.getBalance(),
            worker3.getBalance(),
            worker4.getBalance(),
        ]);
        const expectedBalances = [
            balancesBefore[ 0 ].add(rewardAmount),
            balancesBefore[ 1 ].add(rewardAmount),
            balancesBefore[ 2 ],
            balancesBefore[ 3 ],
        ];
        expect(balancesAfter.every((b, i) => b.eq(expectedBalances[ i ])));
    });

    it("should not be able to add same worker twice", async () => {
        await grantRole(worker1, workerRole);
        
        await matchVoting.addWorker(worker1.address);

        await expect(matchVoting.addWorker(worker1.address)).to.be.revertedWith(
            "WorkerAlreadyAdded"
        );
    });

    it("consensus should not be reached when votes are divided evenly", async () => {
        await grantRole(worker1, workerRole);
        await grantRole(worker2, workerRole);
        await grantRole(worker3, workerRole);
        await grantRole(worker4, workerRole);
        
        
        await matchVoting.addWorker(worker1.address);
        await matchVoting.addWorker(worker2.address);
        await matchVoting.addWorker(worker3.address);
        await matchVoting.addWorker(worker4.address);

        await matchVoting
            .connect(worker1)
            .vote(timeframes[ 0 ].input, timeframes[ 0 ].output);
        await matchVoting
            .connect(worker2)
            .vote(timeframes[ 0 ].input, timeframes[ 0 ].output);
        await matchVoting
            .connect(worker3)
            .vote(timeframes[ 0 ].input, timeframes[ 1 ].output);

        await expect(
            matchVoting
                .connect(worker4)
                .vote(timeframes[ 0 ].input, timeframes[ 1 ].output)
        )
            .to.emit(matchVoting, "NoConsensusReached")
            .withArgs(timeframes[ 0 ].input);

        await matchVoting
            .connect(worker1)
            .vote(timeframes[ 0 ].input, timeframes[ 0 ].output);
        await matchVoting
            .connect(worker2)
            .vote(timeframes[ 0 ].input, timeframes[ 0 ].output);
        await expect(
            matchVoting
                .connect(worker3)
                .vote(timeframes[ 0 ].input, timeframes[ 0 ].output)
        ).to.emit(matchVoting, "WinningMatch");
    });

    it("reward should be paid after replenishment of funds", async () => {
        await grantRole(worker1, workerRole);
        await grantRole(worker2, workerRole);
        
        await matchVoting.addWorker(worker1.address);
        await matchVoting.addWorker(worker2.address);

        await matchVoting
            .connect(worker1)
            .vote(timeframes[ 0 ].input, timeframes[ 0 ].output);
        await matchVoting
            .connect(worker2)
            .vote(timeframes[ 0 ].input, timeframes[ 0 ].output);

        const balancesBefore = await Promise.all([
            worker1.getBalance(),
            worker2.getBalance(),
        ]);

        await expect(
            matchVoting
                .connect(faucet).replenishRewardPool(
                    {
                        value: rewardAmount.mul(3),
                    }
            )
        ).to.emit(matchVoting, "Replenished").withArgs(rewardAmount.mul(3));

        const balancesAfter = await Promise.all([
            worker1.getBalance(),
            worker2.getBalance(),
        ]);

        expect(
            balancesAfter.every((b, i) => b.eq(balancesBefore[ i ].add(rewardAmount)))
        );
    });

    it("reverts when non owner tries to cancel expired votings", async () => {
        await grantRole(worker1, workerRole);
        
        await matchVoting.addWorker(worker1.address);

        await matchVoting
            .connect(worker1)
            .vote(timeframes[ 0 ].input, timeframes[ 0 ].output);

        await timeTravel(2 * timeLimit);

        await expect(matchVoting.connect(worker1).cancelExpiredVotings())
            .to.be.revertedWith("LibDiamond: Must be contract owner");
    });

    it("voting which exceeded time limit can be canceled", async () => {
        await grantRole(worker1, workerRole);
        await grantRole(worker2, workerRole);
        await grantRole(worker3, workerRole);
        
        await matchVoting.addWorker(worker1.address);
        await matchVoting.addWorker(worker2.address);
        await matchVoting.addWorker(worker3.address);

        await matchVoting
            .connect(worker1)
            .vote(timeframes[ 0 ].input, timeframes[ 0 ].output);

        await timeTravel(2 * timeLimit);

        await expect(matchVoting.cancelExpiredVotings())
            .to.emit(matchVoting, "VotingExpired")
            .withArgs(timeframes[ 0 ].input);

        await matchVoting
            .connect(worker1)
            .vote(timeframes[ 0 ].input, timeframes[ 0 ].output);
        await expect(
            matchVoting
                .connect(worker2)
                .vote(timeframes[ 0 ].input, timeframes[ 0 ].output)
        ).to.emit(matchVoting, "WinningMatch");
    });

    it("voting which exceeded time limit must not be completed", async () => {
        await grantRole(worker1, workerRole);
        await grantRole(worker2, workerRole);
        await grantRole(worker3, workerRole);

        await matchVoting.addWorker(worker1.address);
        await matchVoting.addWorker(worker2.address);
        await matchVoting.addWorker(worker3.address);

        await matchVoting
            .connect(worker1)
            .vote(timeframes[ 0 ].input, timeframes[ 0 ].output);

        await timeTravel(2 * timeLimit);

        // voting canceled and restarted
        await expect(
            matchVoting
                .connect(worker2)
                .vote(timeframes[ 0 ].input, timeframes[ 0 ].output)
        )
            .to.emit(matchVoting, "VotingExpired")
            .withArgs(timeframes[ 0 ].input);

        await expect(
            matchVoting
                .connect(worker1)
                .vote(timeframes[ 0 ].input, timeframes[ 0 ].output)
        ).to.emit(matchVoting, "WinningMatch");
    });

    it("voting can not be cancelled by non owner", async () => {
        await grantRole(worker1, workerRole);
        await grantRole(worker2, workerRole);
        await grantRole(worker3, workerRole);

        await matchVoting.addWorker(worker1.address);
        await matchVoting.addWorker(worker2.address);
        await matchVoting.addWorker(worker3.address);

        await matchVoting
            .connect(worker1)
            .vote(timeframes[ 0 ].input, timeframes[ 0 ].output);

        await timeTravel(2 * timeLimit);

        await expect(
            matchVoting.connect(worker2).cancelExpiredVotings()
        ).to.be.revertedWith("LibDiamond: Must be contract owner");
    });

    it("should allow non owner address to add enrolled workers", async () => {
        await grantRole(worker1, workerRole);
        await grantRole(worker2, workerRole);
        await grantRole(worker3, workerRole);

        await matchVoting.connect(worker4).addWorker(worker1.address);
        await matchVoting.connect(worker4).addWorker(worker2.address);
        await matchVoting.connect(worker4).addWorker(worker3.address);

        expect(await matchVoting.isWorker(worker1.address)).to.equal(true);
        expect(await matchVoting.isWorker(worker2.address)).to.equal(true);
        expect(await matchVoting.isWorker(worker3.address)).to.equal(true);
    });

    it("should allow non owner address to remove not enrolled workers", async () => {
        await grantRole(worker1, workerRole);
        await grantRole(worker2, workerRole);
        await grantRole(worker3, workerRole);

        await matchVoting.addWorker(worker1.address);
        await matchVoting.addWorker(worker2.address);
        await matchVoting.addWorker(worker3.address);

        expect(await matchVoting.isWorker(worker1.address)).to.equal(true);
        expect(await matchVoting.isWorker(worker2.address)).to.equal(true);
        expect(await matchVoting.isWorker(worker3.address)).to.equal(true);

        await revokeRole(worker1, workerRole);
        await revokeRole(worker2, workerRole);

        await matchVoting.connect(worker4).removeWorker(worker1.address);
        await matchVoting.connect(worker4).removeWorker(worker2.address);

        expect(await matchVoting.isWorker(worker1.address)).to.equal(false);
        expect(await matchVoting.isWorker(worker2.address)).to.equal(false);
    });

    it("should allow to remove workers and add it again", async () => {
        await grantRole(worker1, workerRole);
        await grantRole(worker2, workerRole);
        await grantRole(worker3, workerRole);

        await matchVoting.addWorker(worker1.address);
        await matchVoting.addWorker(worker2.address);
        await matchVoting.addWorker(worker3.address);

        expect(await matchVoting.isWorker(worker1.address)).to.equal(true);
        expect(await matchVoting.isWorker(worker2.address)).to.equal(true);
        expect(await matchVoting.isWorker(worker3.address)).to.equal(true);

        await revokeRole(worker1, workerRole);
        await revokeRole(worker2, workerRole);
        await revokeRole(worker3, workerRole);

        await matchVoting.removeWorker(worker1.address);
        await matchVoting.removeWorker(worker2.address);
        await matchVoting.removeWorker(worker3.address);

        expect(await matchVoting.isWorker(worker1.address)).to.equal(false);
        expect(await matchVoting.isWorker(worker2.address)).to.equal(false);
        expect(await matchVoting.isWorker(worker3.address)).to.equal(false);

        await grantRole(worker1, workerRole);
        await grantRole(worker2, workerRole);
        await grantRole(worker3, workerRole);

        await matchVoting.addWorker(worker1.address);
        await matchVoting.addWorker(worker2.address);
        await matchVoting.addWorker(worker3.address);

        expect(await matchVoting.isWorker(worker1.address)).to.equal(true);
        expect(await matchVoting.isWorker(worker2.address)).to.equal(true);
        expect(await matchVoting.isWorker(worker3.address)).to.equal(true);
    });
});

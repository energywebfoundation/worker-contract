const {
    getSelector,
    FacetCutAction,
    removeSelectors,
    findAddressPositionInFacets,
} = require("../scripts/libraries/diamond");

const chai = require("chai");
const { assert, expect } = require("chai");
const { parseEther } = require("ethers").utils;
const { ethers, network } = require("hardhat");
const { solidity } = require("ethereum-waffle");
const { deployDiamond } = require("../scripts/deploy");

chai.use(solidity);

const timeTravel = async (seconds) => {
    await network.provider.send("evm_increaseTime", [ seconds ]);
    await network.provider.send("evm_mine", []);
};

describe("VotingFacet", function () {
    let diamondAddress;
    let diamondCutFacet;
    let diamondLoupeFacet;
    let ownershipFacet;
    let issuerFacet;
    let tx;
    let receipt;
    let result;
    const addresses = [];

    let worker1;
    let worker2;
    let worker3;
    let worker4;
    let worker5;
    let worker6;
    let faucet;
    let MatchVotingContrac;
    let certificateContract;
    let rewardVoting;
    let matchVoting;
    const rewardAmount = parseEther("1");
    const IS_SETTLEMENT = true;
    const timeLimit = 15 * 60;

    const timeframes = [
        { input: "MATCH_INPUT_1", output: "MATCH_OUTPUT_1" },
        { input: "MATCH_INPUT_2", output: "MATCH_OUTPUT_2" },
        { input: "MATCH_INPUT_3", output: "MATCH_OUTPUT_3" },
        { input: "MATCH_INPUT_4", output: "MATCH_OUTPUT_4" },
        { input: "MATCH_INPUT_5", output: "MATCH_OUTPUT_5" },
    ];

    beforeEach(async () => {
        console.log(`\n`);
        diamondAddress = await deployDiamond(timeLimit, rewardAmount);
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
            ,
            faucet,
            worker1,
            worker2,
            worker3,
            worker4,
            worker5,
            worker6,
            nonWorker,
        ] = await ethers.getSigners();
        counter = 0;
    });

    it("should allow to vote whitelisted worker", async () => {
        await matchVoting.addWorker(worker1.address);
        expect(
            await matchVoting
                .connect(worker1)
                .vote(timeframes[ 0 ].input, timeframes[ 0 ].output, !IS_SETTLEMENT)
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

    it("should not allow to vote not whitelisted worker", async () => {
        expect(await matchVoting.isWorker(nonWorker.address)).to.be.false;
        await expect(
            matchVoting
                .connect(nonWorker)
                .vote(timeframes[ 0 ].input, timeframes[ 0 ].output, !IS_SETTLEMENT)
        ).to.be.revertedWith("NotWhitelisted");
    });

    it("should get the winner with the most votes", async () => {
        await matchVoting.addWorker(worker1.address);
        await matchVoting.addWorker(worker2.address);
        await matchVoting.addWorker(worker3.address);

        await matchVoting
            .connect(worker1)
            .vote(timeframes[ 0 ].input, timeframes[ 0 ].output, !IS_SETTLEMENT);
        expect(
            await matchVoting
                .connect(worker2)
                .vote(timeframes[ 0 ].input, timeframes[ 0 ].output, !IS_SETTLEMENT)
        )
            .to.emit(matchVoting, "WinningMatch")
            .withArgs(timeframes[ 0 ].input, timeframes[ 0 ].output, 2);

        await expect(
            matchVoting
                .connect(worker3)
                .vote(timeframes[ 0 ].input, timeframes[ 1 ].output, !IS_SETTLEMENT)
        ).to.be.revertedWith("VotingAlreadyEnded");

        expect(await matchVoting.getMatch(timeframes[ 0 ].input)).to.equal(
            timeframes[ 0 ].output
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
            .vote(timeframes[ 0 ].input, timeframes[ 0 ].output, !IS_SETTLEMENT);
        await matchVoting
            .connect(worker2)
            .vote(timeframes[ 0 ].input, timeframes[ 0 ].output, !IS_SETTLEMENT);
        await matchVoting
            .connect(worker3)
            .vote(timeframes[ 0 ].input, timeframes[ 1 ].output, !IS_SETTLEMENT);
        await matchVoting
            .connect(worker4)
            .vote(timeframes[ 0 ].input, timeframes[ 2 ].output, !IS_SETTLEMENT);
        await expect(
            matchVoting
                .connect(worker5)
                .vote(timeframes[ 0 ].input, timeframes[ 3 ].output, !IS_SETTLEMENT)
        )
            .to.emit(matchVoting, "WinningMatch")
            .withArgs(timeframes[ 0 ].input, timeframes[ 0 ].output, 2);

        // Consensus has been reached
        expect(await matchVoting.getMatch(timeframes[ 0 ].input)).to.equal(
            timeframes[ 0 ].output
        );
    });

    it("consensus can be reached with vast majority", async () => {
        await matchVoting.addWorker(worker1.address);
        await matchVoting.addWorker(worker2.address);
        await matchVoting.addWorker(worker3.address);
        await matchVoting.addWorker(worker4.address);
        await matchVoting.addWorker(worker5.address);
        await faucet.sendTransaction({
            to: diamondAddress,
            value: rewardAmount.mul(4), // reward queue balance should be greater then payment
        });
        const nonWinnerBalanceBefore = await worker3.getBalance();

        await matchVoting
            .connect(worker1)
            .vote(timeframes[ 0 ].input, timeframes[ 0 ].output, !IS_SETTLEMENT);
        await matchVoting
            .connect(worker2)
            .vote(timeframes[ 0 ].input, timeframes[ 0 ].output, !IS_SETTLEMENT);

        const balancesBefore = await Promise.all([
            worker1.getBalance(),
            worker2.getBalance(),
            worker3.getBalance(),
            worker4.getBalance(),
        ]);

        await expect(
            matchVoting
                .connect(worker5)
                .vote(timeframes[ 0 ].input, timeframes[ 0 ].output, !IS_SETTLEMENT)
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
            .vote(timeframes[ 0 ].input, timeframes[ 0 ].output, !IS_SETTLEMENT);
        await matchVoting
            .connect(worker2)
            .vote(timeframes[ 0 ].input, timeframes[ 0 ].output, !IS_SETTLEMENT);
        await matchVoting
            .connect(worker3)
            .vote(timeframes[ 0 ].input, timeframes[ 1 ].output, !IS_SETTLEMENT);

        await expect(
            matchVoting
                .connect(worker4)
                .vote(timeframes[ 0 ].input, timeframes[ 1 ].output, !IS_SETTLEMENT)
        )
            .to.emit(matchVoting, "NoConsensusReached")
            .withArgs(timeframes[ 0 ].input);

        await matchVoting
            .connect(worker1)
            .vote(timeframes[ 0 ].input, timeframes[ 0 ].output, !IS_SETTLEMENT);
        await matchVoting
            .connect(worker2)
            .vote(timeframes[ 0 ].input, timeframes[ 0 ].output, !IS_SETTLEMENT);
        await expect(
            matchVoting
                .connect(worker3)
                .vote(timeframes[ 0 ].input, timeframes[ 0 ].output, !IS_SETTLEMENT)
        ).to.emit(matchVoting, "WinningMatch");
    });

    it("reward should be paid after replenishment of funds", async () => {
        await matchVoting.addWorker(worker1.address);
        await matchVoting.addWorker(worker2.address);

        await matchVoting
            .connect(worker1)
            .vote(timeframes[ 0 ].input, timeframes[ 0 ].output, !IS_SETTLEMENT);
        await matchVoting
            .connect(worker2)
            .vote(timeframes[ 0 ].input, timeframes[ 0 ].output, !IS_SETTLEMENT);

        const balancesBefore = await Promise.all([
            worker1.getBalance(),
            worker2.getBalance(),
        ]);

        await faucet.sendTransaction({
            to: diamondAddress,
            value: rewardAmount.mul(3),
        });

        const balancesAfter = await Promise.all([
            worker1.getBalance(),
            worker2.getBalance(),
        ]);

        expect(
            balancesAfter.every((b, i) => b.eq(balancesBefore[ i ].add(rewardAmount)))
        );
    });

    it("voting which exceeded time limit can be canceled", async () => {
        await matchVoting.addWorker(worker1.address);
        await matchVoting.addWorker(worker2.address);
        await matchVoting.addWorker(worker3.address);

        await matchVoting
            .connect(worker1)
            .vote(timeframes[ 0 ].input, timeframes[ 0 ].output, !IS_SETTLEMENT);

        await timeTravel(2 * timeLimit);

        await expect(matchVoting.cancelExpiredVotings())
            .to.emit(matchVoting, "VotingExpired")
            .withArgs(timeframes[ 0 ].input);

        await matchVoting
            .connect(worker1)
            .vote(timeframes[ 0 ].input, timeframes[ 0 ].output, !IS_SETTLEMENT);
        await expect(
            matchVoting
                .connect(worker2)
                .vote(timeframes[ 0 ].input, timeframes[ 0 ].output, !IS_SETTLEMENT)
        ).to.emit(matchVoting, "WinningMatch");
    });

    it("voting which exceeded time limit must not be completed", async () => {
        await matchVoting.addWorker(worker1.address);
        await matchVoting.addWorker(worker2.address);
        await matchVoting.addWorker(worker3.address);

        await matchVoting
            .connect(worker1)
            .vote(timeframes[ 0 ].input, timeframes[ 0 ].output, !IS_SETTLEMENT);

        await timeTravel(2 * timeLimit);

        // voting canceled and restarted
        await expect(
            matchVoting
                .connect(worker2)
                .vote(timeframes[ 0 ].input, timeframes[ 0 ].output, !IS_SETTLEMENT)
        )
            .to.emit(matchVoting, "VotingExpired")
            .withArgs(timeframes[ 0 ].input);

        await expect(
            matchVoting
                .connect(worker1)
                .vote(timeframes[ 0 ].input, timeframes[ 0 ].output, !IS_SETTLEMENT)
        ).to.emit(matchVoting, "WinningMatch");
    });

    it("voting can not be cancelled by non owner", async () => {
        await matchVoting.addWorker(worker1.address);
        await matchVoting.addWorker(worker2.address);
        await matchVoting.addWorker(worker3.address);

        await matchVoting
            .connect(worker1)
            .vote(timeframes[ 0 ].input, timeframes[ 0 ].output, !IS_SETTLEMENT);

        await timeTravel(2 * timeLimit);

        await expect(
            matchVoting.connect(worker2).cancelExpiredVotings()
        ).to.be.revertedWith("Ownable: caller is not the owner");
    });
});

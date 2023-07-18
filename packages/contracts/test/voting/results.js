const { expect } = require("chai");
const { utils } = require("ethers");
const {
  DEFAULT_REWARD_AMOUNT,
} = require("../../deploy/deployContracts");

const { formatEther } = utils;

module.exports.resultsTests = function () {
  const { initFixture, loadFixture } = this.parent;

  it("should not reveal workers vote before the end of vote", async () => {
    const {
      workers,
      timeframes,
      setupVotingContract
    } = await loadFixture(initFixture);
    
    votingContract = await setupVotingContract({
      majorityPercentage: 100,
      participatingWorkers: [workers[0], workers[1]],
    });

    await workers[0].voteNotWinning(timeframes[0].input, timeframes[0].output);

    expect(
      await votingContract.getWorkerVotes(
        timeframes[0].input,
        workers[0].address
      )
    ).to.deep.equal([]);
  });

  it("should reveal workers vote after the end of vote", async () => {
    const {
      workers,
      timeframes,
      setupVotingContract
    } = await loadFixture(initFixture);
    
    votingContract = await setupVotingContract({
      majorityPercentage: 100,
      participatingWorkers: [workers[0], workers[1]],
    });

    workers[0].voteNotWinning(timeframes[0].input, timeframes[0].output);
    workers[1].voteWinning(timeframes[0].input, timeframes[0].output, {
      voteCount: 2,
    });

    expect(
      await votingContract.getWorkerVotes(
        timeframes[0].input,
        workers[0].address
      )
    ).to.deep.equal([timeframes[0].output]);
    expect(
      await votingContract.getWorkerVotes(
        timeframes[0].input,
        workers[1].address
      )
    ).to.deep.equal([timeframes[0].output]);
  });

  it("should not reveal winners before the end of vote", async () => {
    const {
      workers,
      timeframes,
      setupVotingContract
    } = await loadFixture(initFixture);
    
    votingContract = await setupVotingContract({
      majorityPercentage: 100,
      participatingWorkers: [workers[0], workers[1]],
    });

    workers[0].voteNotWinning(timeframes[0].input, timeframes[0].output);
    expect(
      await votingContract.getWinners(timeframes[0].input, timeframes[0].output)
    ).to.be.empty;

    workers[1].voteWinning(timeframes[0].input, timeframes[0].output, {
      voteCount: 2,
    });
    expect(
      await votingContract.getWinners(timeframes[0].input, timeframes[0].output)
    ).to.be.deep.equal([workers[0].address, workers[1].address]);
  });

  it("should not reveal winningMatches before the end of vote", async () => {
    const {
      workers,
      timeframes,
      setupVotingContract
    } = await loadFixture(initFixture);
    
    votingContract = await setupVotingContract({
      participatingWorkers: [workers[0], workers[1], workers[2]],
    });

    workers[0].voteNotWinning(timeframes[0].input, timeframes[0].output);
    //The vote is not ended, hence we should not get the winngMatch
    expect(
      await votingContract.getWinningMatches(timeframes[0].input)
    ).to.deep.equal([]);

    workers[1].voteNotWinning(timeframes[0].input, timeframes[2].output);
    //The vote is still not ended, hence we should not get the winngMatch
    expect(
      await votingContract.getWinningMatches(timeframes[0].input)
    ).to.deep.equal([]);

    workers[2].voteWinning(timeframes[0].input, timeframes[0].output, {
      voteCount: 2,
    });
    //The vote ended, hence we should get the winngMatch
    expect(
      await votingContract.getWinningMatches(timeframes[0].input)
    ).to.deep.equal([timeframes[0].output]);
  });

  it("should get the winner with the most votes", async () => {
    const {
      workers,
      timeframes,
      setupVotingContract
    } = await loadFixture(initFixture);
    
    votingContract = await setupVotingContract({
      participatingWorkers: [workers[0], workers[1], workers[2]],
    });

    workers[0].voteNotWinning(timeframes[0].input, timeframes[0].output);
    workers[1].voteWinning(timeframes[0].input, timeframes[0].output, {
      voteCount: 2,
    });

    expect(
      await votingContract.getWinningMatches(timeframes[0].input)
    ).to.deep.equal([timeframes[0].output]);
  });

  it("should be able to get the list of whiteListed workers", async () => {
    const {
      workers,
      setupVotingContract
    } = await loadFixture(initFixture);
    
    votingContract = await setupVotingContract({
      participatingWorkers: [workers[0]],
    });
    let expectedList = [workers[0].address]

    expect(await votingContract.getWorkers()).to.deep.equal(expectedList);
    
    votingContract = await setupVotingContract({
      participatingWorkers: [workers[0], workers[2], workers[3]],
    });
    expectedList = [workers[0].address, workers[2].address, workers[3].address]

    expect(await votingContract.getWorkers()).to.deep.equal(expectedList);
  });

  it("should get the number of voteIDs casted in the system", async () => {
    const {
      workers,
      timeframes,
      setupVotingContract
    } = await loadFixture(initFixture);

    votingContract = await setupVotingContract({
      participatingWorkers: [workers[0], workers[1], workers[2]],
    });

    expect(
      await votingContract.numberOfVotings()
    ).to.be.equal(0);

    await votingContract.connect(workers[0].wallet).vote(timeframes[0].input, timeframes[0].output)
   
    expect(
      await votingContract.numberOfVotings()
    ).to.be.equal(1);
    
    await votingContract.connect(workers[ 1 ].wallet).vote(timeframes[ 1 ].input, timeframes[ 2 ].output)
    await votingContract.connect(workers[2].wallet).vote(timeframes[2].input, timeframes[1].output)

    expect(
      await votingContract.numberOfVotings()
    ).to.be.equal(3);
  });

  it("should not be able to restart session", async () => {
    const {
      workers,
      timeframes,
      setupVotingContract
    } = await loadFixture(initFixture);
    
    votingContract = await setupVotingContract({
      majorityPercentage: 50,
      participatingWorkers: [workers[0], workers[1]],
    });

    workers[0].voteWinning(timeframes[0].input, timeframes[0].output, {
      voteCount: 1,
      winningOutput: timeframes[0].output,
    });

    await expect(
      votingContract
        .connect(workers[1].wallet)
        .vote(timeframes[0].input, timeframes[0].output)
    ).to.be.revertedWith("SessionCannotBeRestarted");
  });

  describe("Rewards", function () {
    const REWARD = ethers.utils.parseEther("123");

    it("pays proper reward to the winners", async () => {
      const {
        workers,
        timeframes,
        setupVotingContract
      } = await loadFixture(initFixture);
      
      votingContract = await setupVotingContract({
        reward: REWARD,
        participatingWorkers: [
          workers[0],
          workers[1],
          workers[2],
          workers[3],
          workers[4],
        ],
        rewardPool: REWARD.mul(2),
        rewardsEnabled: true
      });

      workers[0].voteNotWinning(timeframes[0].input, timeframes[0].output);
      workers[1].voteNotWinning(timeframes[0].input, timeframes[0].output);

      await expectToReceiveReward({
        winners: [workers[0], workers[1], workers[4]],
        possiblePayouts: 2,
        operation: () =>
          workers[4].voteWinning(timeframes[0].input, timeframes[0].output, {
            voteCount: 3,
          }),
      });

      expect(
        await votingContract.getWinningMatches(timeframes[0].input)
      ).to.deep.equal([timeframes[0].output]);
    });

    it("reward should be paid after replenishment of funds", async () => {
      const {
        faucet,
        workers,
        timeframes,
        setupVotingContract
      } = await loadFixture(initFixture);
      
      votingContract = await setupVotingContract({
        reward: REWARD,
        participatingWorkers: [ workers[ 0 ], workers[ 1 ] ],
      });

      workers[0].voteNotWinning(timeframes[0].input, timeframes[0].output);
      workers[1].voteWinning(timeframes[0].input, timeframes[0].output, {
        voteCount: 2,
      });

      await expectToReceiveReward({
        winners: [workers[0], workers[1]],
        possiblePayouts: 2,
        operation: () =>
          expect(
          votingContract.connect(faucet).replenishRewardPool({
            value: REWARD.mul(2),
            })
          )
            .to.emit(votingContract, "RewardsPaidOut")
            .withArgs(2),
      });
    });

    it("should revert when calling replenishment of funds with no funds", async () => {
      const {
        faucet,
        workers,
        setupVotingContract
      } = await loadFixture(initFixture);
      
      votingContract = await setupVotingContract({
        reward: REWARD,
        participatingWorkers: [workers[0], workers[1]],
      });

      await expect(
        votingContract.connect(faucet).replenishRewardPool({
            value: 0,
        })
      ).to.be.revertedWith("NoFundsProvided");
    });

    it("should correctly proceed to rewardPool replenishment", async () => {
      const {
        faucet,
        workers,
        setupVotingContract
      } = await loadFixture(initFixture);
      
      votingContract = await setupVotingContract({
        reward: REWARD,
        participatingWorkers: [workers[0], workers[1]],
      });

      await expect(
        votingContract.connect(faucet).replenishRewardPool({
            value: REWARD,
        })
      ).to.emit(votingContract, "Replenished").withArgs(REWARD);
    });

    it("should revert when calling replenishment of funds with rewards disabled", async () => {
      const {
        faucet,
        workers,
        setupVotingContract
      } = await loadFixture(initFixture);

      votingContract = await setupVotingContract({
        reward: REWARD,
        participatingWorkers: [workers[0], workers[1]],
        rewardsEnabled: false,
      });

      await expect(
        votingContract.connect(faucet).replenishRewardPool({
            value: REWARD.mul(2),
        })
      ).to.be.revertedWith("RewardsDisabled()");
    });

    it("rewards should be paid partially and then fully after charging up the pool", async () => {
      const {
        faucet,
        workers,
        timeframes,
        setupVotingContract
      } = await loadFixture(initFixture);

      votingContract = await setupVotingContract({
        reward: REWARD,
        participatingWorkers: [workers[0], workers[1]],
        rewardPool: REWARD,
        rewardsEnabled: true,
      });
      workers[0].voteNotWinning(timeframes[0].input, timeframes[0].output);

      await expectToReceiveReward({
        winners: [workers[0], workers[1]],
        possiblePayouts: 1,
        operation: () =>
          workers[1].voteWinning(timeframes[0].input, timeframes[0].output, {
            voteCount: 2,
          }),
      });

      await expectToReceiveReward({
        winners: [workers[0], workers[1]],
        possiblePayouts: 1,
        operation: () =>
          expect(
          votingContract.connect(faucet).replenishRewardPool({
            value: REWARD,
            })
          )
            .to.emit(votingContract, "RewardsPaidOut")
            .withArgs(1),
      });
    });

    it("rewards should be paid partially then fully after calling PayReward manually", async () => {
      const {
        faucet,
        workers,
        timeframes,
        setupVotingContract
      } = await loadFixture(initFixture);
      
      votingContract = await setupVotingContract({
        reward: REWARD,
        participatingWorkers: [workers[0], workers[1]],
        rewardPool: REWARD,
        rewardsEnabled: true,
      });
      await workers[0].voteNotWinning(timeframes[0].input, timeframes[0].output);

      // Only 1 worker over 2 can be rewarded
      await expectToReceiveReward({
        winners: [workers[0], workers[1]],
        possiblePayouts: 1,
        operation: () =>
          workers[1].voteWinning(timeframes[0].input, timeframes[0].output, {
            voteCount: 2,
          }),
      });

      //Send additional funds to the contract
      await faucet.sendTransaction({
        to: votingContract.address,
        value: REWARD.mul(10)
      })

      const maxNumberOfPayements = 10;
      const effectiveNumberOfPayements = 1;

      await expectToReceiveReward({
        winners: [workers[0], workers[1]],
        possiblePayouts: 1,
        operation: () =>
          expect(
            votingContract.payReward(maxNumberOfPayements)
          )
            .to.emit(votingContract, "RewardsPaidOut")
            .withArgs(effectiveNumberOfPayements),
      });
    });

    it("rewards transactions are correctly limited when we PayReward manually", async () => {
      const {
        faucet,
        workers,
        timeframes,
        setupVotingContract
      } = await loadFixture(initFixture);

      const OneWei = 1;

      votingContract = await setupVotingContract({
        reward: REWARD,
        participatingWorkers: [workers[0], workers[1], workers[2], workers[3]],
        rewardPool: OneWei, // We don't provide enough funds during deployment
        rewardsEnabled: true,
      });
      await workers[0].voteNotWinning(timeframes[0].input, timeframes[0].output);
      await workers[1].voteNotWinning(timeframes[0].input, timeframes[0].output);
      await workers[2].voteNotWinning(timeframes[0].input, timeframes[1].output);
      const tx = await workers[3].voteWinning(timeframes[0].input, timeframes[0].output, {
            voteCount: 3,
      });

      // We are making sure that the rewards are not paid (not enough funds)
      // Even if the consensus is reached
      await expect(tx).to.not.emit(votingContract, "RewardsPaidOut");
      await expect(tx).to.emit(votingContract, "ConsensusReached");

      // We send sufficient funds to the contract to handle 1 rewarding over 3
      await faucet.sendTransaction({
        to: votingContract.address,
        value: REWARD
      });

      // We set the payment limit to 2
      const maxNumberOfPayements = 2;

      // Wet are expecting only 1 payments
      const effectiveNumberOfPayements = 1;

      // We call the PayReward function and verify that only 1 payment is done 
      await expectToReceiveReward({
        winners: [workers[0], workers[1], workers[3]],
        possiblePayouts: 1,
        operation: () =>
          expect(
            votingContract.payReward(maxNumberOfPayements)
          )
            .to.emit(votingContract, "RewardsPaidOut")
            .withArgs(effectiveNumberOfPayements),
      });

      // We replenish the pool and verify that the remaining 2 payments are executed
      await expectToReceiveReward({
        winners: [workers[0], workers[1], workers[3]],
        possiblePayouts: 2,
        operation: () =>
          expect(
            votingContract.connect(faucet).replenishRewardPool({
              value: REWARD.mul(2)
            })
          )
            .to.emit(votingContract, "RewardsPaidOut")
            .withArgs(2),
      });
    });
    
    it("Should not allow to PayReward manually when rewards are disabled", async () => {
      const {
        faucet,
        workers,
        timeframes,
        setupVotingContract
      } = await loadFixture(initFixture);

      const OneWei = 1;

      votingContract = await setupVotingContract({
        reward: REWARD,
        participatingWorkers: [workers[0], workers[1], workers[2], workers[3]],
        rewardPool: OneWei, // We don't provide enough funds during deployment to avoid automatic rewarding
        rewardsEnabled: true, // Initially rewards are enabled
      });

      await workers[0].voteNotWinning(timeframes[0].input, timeframes[0].output);
      await workers[1].voteNotWinning(timeframes[0].input, timeframes[0].output);
      await workers[2].voteNotWinning(timeframes[0].input, timeframes[1].output);
      let tx = await workers[3].voteWinning(timeframes[0].input, timeframes[0].output, {
            voteCount: 3,
      });

      // We are making sure that the rewards are not paid (not enough funds)
      // Even if the consensus is reached
      await expect(tx).to.not.emit(votingContract, "RewardsPaidOut");
      await expect(tx).to.emit(votingContract, "ConsensusReached");

      // We send sufficient funds to the contract to handle 3 rewardings
      await faucet.sendTransaction({
        to: votingContract.address,
        value: REWARD.mul(3)
      });

      // Disabling Rewarding
      tx = await votingContract.setRewardsEnabled(false);
      await tx.wait();

      // Verifying that rewards are disabled
      await expect(tx).to.emit(votingContract, "RewardsDeactivated");

      // We set the payment limit to 10
      const maxNumberOfPayements = 10;

      // Wet are expecting only 3 payments
      const effectiveNumberOfPayements = 3;

      // Making sure that the transaction correctly reverts
      await expect(
        votingContract.payReward(maxNumberOfPayements)
      ).to.be.revertedWith("RewardsDisabled");

      // Enabling rewards
      tx = await votingContract.setRewardsEnabled(true);
      await tx.wait();

      // Verifying that rewards are enabled
      await expect(tx).to.emit(votingContract, "RewardsActivated");

      // verifying that rewards are paid
      await expect(
        votingContract.payReward(maxNumberOfPayements)
      ).to.emit(votingContract, "RewardsPaidOut")
        .withArgs(effectiveNumberOfPayements);
    });

    it("Should correctly reward after voting worker has been removed", async () => {
      const {
        workers,
        timeframes,
        removeWorkers,
        setupVotingContract
      } = await loadFixture(initFixture);

      const REWARD = ethers.utils.parseEther("1");

      votingContract = await setupVotingContract({
      reward: REWARD,
      participatingWorkers: [
      workers[0],
      workers[1],
      workers[2],
      workers[3],
      workers[4],
      ],
      rewardPool: REWARD.mul(3),
      rewardsEnabled: true
      });
      await workers[0].voteNotWinning(timeframes[0].input, timeframes[0].output);
      await workers[1].voteNotWinning(timeframes[0].input, timeframes[0].output);
      await removeWorkers([ workers[ 0 ] ]);
      

      expect(await ethers.provider.getBalance(ethers.constants.AddressZero)).to.equal(0);
      const tx = await workers[ 4 ].voteWinning(
        timeframes[ 0 ].input,
        timeframes[ 0 ].output,
        {
          voteCount: 3,
        },
      );

      //We are making sure that all winners (included the removed one) are correctly rewarded
      expect(await tx).changeEtherBalance(workers[ 0 ].wallet, REWARD);
      expect(await tx).changeEtherBalance(workers[ 1 ].wallet, REWARD);
      expect(await tx).changeEtherBalance(workers[ 4 ].wallet, REWARD);

      expect(await ethers.provider.getBalance(ethers.constants.AddressZero)).to.equal(0);

    });

    describe("Rewards management", function () {

      it("should correctly update reward feature", async () => {
        const {
        workers,
        setupVotingContract
        } = await loadFixture(initFixture);

        votingContract = await setupVotingContract({
          reward: REWARD,
          participatingWorkers: [ workers[ 0 ], workers[ 1 ] ],
          rewardsEnabled: true,
        });

        await expect(
          votingContract.setRewardsEnabled(false)
        ).to.emit(votingContract, "RewardsDeactivated");

        await expect(
          votingContract.setRewardsEnabled(true)
        ).to.emit(votingContract, "RewardsActivated");
      });

      it("should revert when updating reward feature to the same state", async () => {
      const {
        workers,
        setupVotingContract
      } = await loadFixture(initFixture);
        
        votingContract = await setupVotingContract({
          reward: REWARD,
          participatingWorkers: [ workers[ 0 ], workers[ 1 ] ],
          rewardsEnabled: true,
        });

        await expect(
          votingContract.setRewardsEnabled(false)
        ).to.emit(votingContract, "RewardsDeactivated");

        await expect(
          votingContract.setRewardsEnabled(false)
        ).to.be.revertedWith(`RewardStateNotChanged(false)`);
      });

      it("should not pay the winners if rewards are disabled", async () => {
        const {
          workers,
          timeframes,
          setupVotingContract
        } = await loadFixture(initFixture);
        
        votingContract = await setupVotingContract({
          reward: REWARD,
          participatingWorkers: [
            workers[0],
            workers[1],
            workers[2],
            workers[3],
            workers[4],
          ],
          rewardPool: REWARD.mul(5),
          rewardsEnabled: false,
        });

        workers[0].voteNotWinning(timeframes[0].input, timeframes[0].output);
        workers[1].voteNotWinning(timeframes[0].input, timeframes[0].output);

        await expectToReceiveReward({
          winners: [],
          possiblePayouts: 0,
          operation: () =>
            workers[4].voteWinning(timeframes[0].input, timeframes[0].output, {
              voteCount: 3,
            }),
        });

        expect(
          await votingContract.getWinningMatches(timeframes[0].input)
        ).to.deep.equal([timeframes[0].output]);
      });

      it("should revert when non owner tries to enable and disable rewards", async () => {
        const {
          faucet,
          workers,
          setupVotingContract
        } = await loadFixture(initFixture);
        
        const nonOwner = faucet;
        
        votingContract = await setupVotingContract({
          reward: REWARD,
          participatingWorkers: [ workers[ 0 ], workers[ 1 ] ],
          rewardsEnabled: false,
        });
        

        await expect(
          votingContract.connect(nonOwner).setRewardsEnabled(true)
        ).to.be.revertedWith(`NotAuthorized("Owner", "${nonOwner.address}")`);
      });

      it("should revert when tries to enable rewards twice", async () => {
        const {
          faucet,
          workers,
          setupVotingContract
        } = await loadFixture(initFixture);
        
        const nonOwner = faucet;
        
        votingContract = await setupVotingContract({
          reward: REWARD,
          participatingWorkers: [ workers[ 0 ], workers[ 1 ] ],
          rewardsEnabled: false,
        });
        

        await expect(
          votingContract.connect(nonOwner).setRewardsEnabled(true)
        ).to.be.revertedWith(`NotAuthorized("Owner", "${nonOwner.address}")`);
      });

      it("should pay the rewards after enabling rewards", async () => {
        const {
          faucet,
          workers,
          timeframes,
          setupVotingContract
        } = await loadFixture(initFixture);
        
        votingContract = await setupVotingContract({
          reward: REWARD,
          participatingWorkers: [workers[0], workers[1]],
          rewardsEnabled: false,
        });

        await workers[0].voteNotWinning(
          timeframes[0].input,
          timeframes[0].output
        );

        await workers[1].voteWinning(
          timeframes[0].input,
          timeframes[0].output,
          { voteCount: 2}
        );

        const tx = await votingContract.setRewardsEnabled(true);
        await tx.wait();

        await workers[0].voteNotWinning(
          timeframes[1].input,
          timeframes[0].output
        );

        await workers[1].voteWinning(
          timeframes[1].input,
          timeframes[0].output,
          { voteCount: 2}
        );

      await expectToReceiveReward({
        winners: [workers[0], workers[1]],
        possiblePayouts: 2,
        operation: () =>
          votingContract.connect(faucet).replenishRewardPool({
            value: REWARD.mul(2),
          }),
      });
      });
    });

    const expectToReceiveReward = async ({
      winners = [],
      losers = [],
      // How many workers can be paid with current pool?
      possiblePayouts = winners.length,
      operation,
    }) => {
      const winnersBefore = await Promise.all(
        winners.map((w) => w.getBalance())
      );
      const losersBefore = await Promise.all(losers.map((w) => w.getBalance()));

      await operation();

      const winnersAfter = await Promise.all(
        winners.map((w) => w.getBalance())
      );
      const losersAfter = await Promise.all(losers.map((w) => w.getBalance()));

      const currentWinners = winnersAfter.filter((after, i) =>
        after.gt(winnersBefore[i])
      );
      expect(currentWinners).to.have.length(possiblePayouts);
      expect(losersAfter.every((b, i) => b.lt(losersBefore[i]))).to.be.true;
    };
  });
};

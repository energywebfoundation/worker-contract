const { network } = require('hardhat');

const timeTravel = async (seconds) => {
  await network.provider.send('evm_increaseTime', [seconds]);
  await network.provider.send('evm_mine', []);
};

const getTimeStamp = async (tx) => {
  const timestamp = (await ethers.provider.getBlock(tx.blockNumber)).timestamp;

  return timestamp;
}

module.exports = { timeTravel, getTimeStamp };
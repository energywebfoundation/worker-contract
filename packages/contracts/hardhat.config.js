/* global ethers task */
// require("hardhat-diamond-abi");
require('solidity-coverage');
require("@typechain/hardhat");
require("hardhat-gas-reporter");
require("hardhat-contract-sizer");
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-solhint");
const dotenv = require("dotenv");
const path = require('path');

dotenv.config();
// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async () => {
  const accounts = await ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.16",
        settings: {
          optimizer: {
            enabled: true,
            runs: 10000,
          },
        },
      },
    ],
  },
  networks: {
    ganache: {
      url: "http://localhost:8545",
    },
    volta: {
      url: process.env.VOLTA_RPC_URL ? process.env.VOLTA_RPC_URL : "https://volta-rpc.energyweb.org",
      chainId: 73799,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    ewc: {
      url: process.env.EWC_RPC_URL ? process.env.EWC_RPC_URL : "https://rpc.energyweb.org",
      chainId: 246,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: 1000000000,
    },
    goerli: {
      url: `https://eth-goerli.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY}`,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    }
  },
  gasReporter: {
    currency: 'USD',
    gasPrice: 21,
    enabled: false,
    coinmarketcap: process.env.COIN_MARKET_CAP_API,
    token: "EWT",
    enabled: process.env.ENABLE_GAS_REPORTING == "true",
    outputFile: process.env.GAS_REPORT_OUTPUT_FILE,
    noColors: process.env.GAS_REPORT_OUTPUT_FILE ? true : false,
  },
  contractSizer: {
    alphaSort: false,
    runOnCompile: true,
    disambiguatePaths: true,
  },
  typechain: {
    outDir: path.join(__dirname, "src"),
  },
};

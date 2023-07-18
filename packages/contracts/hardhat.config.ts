/* global ethers task */
// require("hardhat-diamond-abi");
import path from "path";
import "dotenv/config";
import "hardhat-deploy";
import "solidity-coverage";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "hardhat-contract-sizer";
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-solhint";
// import { HardhatUserConfig } from "hardhat/types";

const dotenv = require("dotenv");

dotenv.config();
// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
// task("accounts", "Prints the list of accounts", async () => {
//   const accounts = await ethers.getSigners();

//   for (const account of accounts) {
//     console.log(account.address);
//   }
// });

const config = {
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
      url: process.env.VOLTA_RPC_URL
        ? process.env.VOLTA_RPC_URL
        : "https://volta-rpc.energyweb.org",
      chainId: 73799,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    ewc: {
      url: process.env.EWC_RPC_URL
        ? process.env.EWC_RPC_URL
        : "https://rpc.energyweb.org",
      chainId: 246,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: 1000000000,
    },
    goerli: {
      url: `https://eth-goerli.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY}`,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
  namedAccounts: {
    owner: {
      default: 0,
      73799: "0xC3571714248588C6E19cDECe2778B75341b2c288",
      246: "0xC3571714248588C6E19cDECe2778B75341b2c288",
    },
    deployer: {
      default: 1,
      73799: "0xC3571714248588C6E19cDECe2778B75341b2c288",
      246: "0xC3571714248588C6E19cDECe2778B75341b2c288",
    },
    issuer: 2,
  },
  gasReporter: {
    currency: "USD",
    gasPrice: 21,
    coinmarketcap: process.env.COIN_MARKET_CAP_API,
    token: "EWT",
    enabled: process.env.ENABLE_GAS_REPORTING == "true",
    outputFile: process.env.GAS_REPORT_OUTPUT_FILE,
    noColors: process.env.GAS_REPORT_OUTPUT_FILE ? true : false,
  },
  contractSizer: {
    alphaSort: false,
    runOnCompile: false,
    disambiguatePaths: true,
  },
  typechain: {
    outDir: path.join(__dirname, "src"),
  },
};

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

export default config;

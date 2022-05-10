import * as dotenv from "dotenv";

import { HardhatUserConfig, task } from "hardhat/config";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";
import "@nomiclabs/hardhat-ethers";
import path from "path";
import { constants } from "ethers";

dotenv.config();

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

const getPrivateKey = () => {
  const privateKey = process.env.PRIVATE_KEY;

  if (!privateKey) {
    throw new Error("No PRIVATE_KEY env variable set");
  }

  return privateKey;
};

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

const config: HardhatUserConfig = {
  solidity: "0.8.4",
  defaultNetwork: "ganache",
  networks: {
    ganache: {
      url: "http://localhost:8545",
    },
    volta: {
      url: "https://volta-rpc.energyweb.org",
      chainId: 73799,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  typechain: {
    outDir: path.join(__dirname, "..", "voting-manager", "src", "typechain"),
  },
};

export default config;

import { HardhatUserConfig } from "hardhat/config";
// import "@nomicfoundation/hardhat-toolbox";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import path from 'path';

const config: HardhatUserConfig = {
  solidity: "0.8.9",
  typechain: {
    outDir: path.join(__dirname, "src"),
  },
};

export default config;

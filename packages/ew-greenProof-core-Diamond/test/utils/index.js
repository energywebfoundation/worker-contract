const { utils } = require("ethers");
const { checkProof } = require("./merkleProof.utils");
const { claimManagerABI } = require("./claimManager_abi");

const toBytes32 = (input) => {
  return utils.formatBytes32String(input);
};

const claimManagerInterface = claimManagerABI;

module.exports = {
  toBytes32,
  checkProof,
  claimManagerInterface,
};

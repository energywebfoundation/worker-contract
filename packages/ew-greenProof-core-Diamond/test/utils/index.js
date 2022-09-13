const { utils } = require("ethers");
const { claimManagerABI } = require("./claimManager_abi");
const { checkProof, getMerkleProof} = require("./merkleProof.utils");

const toBytes32 = (input) => {
  return utils.formatBytes32String(input);
};

const claimManagerInterface = claimManagerABI;

module.exports = {
  toBytes32,
  checkProof,
  getMerkleProof,
  claimManagerInterface,
};

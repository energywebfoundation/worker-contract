const { utils } = require("ethers");
const { FormatTypes, Interface } = utils;

const claimManagerAbi = [
  "function hasRole(address subject, bytes32 role, uint256 version) public view returns(bool)",
];

const claimRevocationRegistryAbi = [
  "function isRevoked(bytes32 role, address subject) public view returns (bool)",
];

const ifaceClaimManager = new Interface(claimManagerAbi);
const ifaceClaimRevocation = new Interface(claimRevocationRegistryAbi);

const claimManagerABI = ifaceClaimManager.format(FormatTypes.json);
const claimRevocationRegistryABI = ifaceClaimRevocation.format(FormatTypes.json);

module.exports = {
  claimManagerABI,
  claimRevocationRegistryABI
};

const { utils } = require("ethers");
const { FormatTypes, Interface } = utils;

const abi = [
  "function hasRole(address subject, bytes32 role, uint256 version) public view returns(bool)",
];
const iface = new Interface(abi);
const claimManagerABI = iface.format(FormatTypes.json);

module.exports = {
  claimManagerABI,
};

const { utils } = require("ethers");
const { deployMockContract } = require('ethereum-waffle');
const { FormatTypes, Interface } = utils;

const abi = [
  "function hasRole(address subject, bytes32 role, uint256 version) public view returns(bool)",
];
const iface = new Interface(abi);
const claimManagerABI = iface.format(FormatTypes.json);

const defaultVersion = 1;
const claimManagerInterface = claimManagerABI;

const initMockClaimManager = async (owner) => {
  const contract = await deployMockContract(
    owner,
    claimManagerInterface
  );

  const grantRole = async (address, role) => {
    await contract.mock.hasRole
      .withArgs(address, role, defaultVersion)
      .returns(true);
  };

  const revokeRole = async (address, role) => {
    await contract.mock.hasRole
      .withArgs(address, role, defaultVersion)
      .returns(false);
  };

  return {
    revokeRole,
    grantRole,
    contract,
    address: contract.address
  }
}


module.exports = {
  claimManagerABI,
  claimManagerInterface,
  initMockClaimManager
};

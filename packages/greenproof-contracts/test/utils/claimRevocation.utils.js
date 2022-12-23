const { utils } = require("ethers");
const { deployMockContract } = require("ethereum-waffle");
const { FormatTypes, Interface } = utils;

const abi = [
  "function isRevoked(bytes32 role, address subject) public view returns (bool)",
];
const claimRevocationRegistryABI = new Interface(abi).format(FormatTypes.json);

const initMockClaimRevoker = async (owner) => {
  const contract = await deployMockContract(owner, claimRevocationRegistryABI);

  await contract.deployed();

  const isRevoked = async (role, address, isRevoked) =>
    await contract.mock.isRevoked.withArgs(role, address).returns(isRevoked);

  return {
    contract,
    address: contract.address,
    isRevoked,
  };
};

module.exports = {
  claimRevocationRegistryABI,
  initMockClaimRevoker,
};

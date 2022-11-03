const { utils } = require("ethers");
const { claimManagerABI, claimRevocationRegistryABI } = require("./claimManager_abi");
const { getMerkleProof} = require("./merkleProof.utils");
const {
  deployMockContract,
  MockContract,
  solidity,
} = require("ethereum-waffle");


const toBytes32 = (input) => {
  return utils.formatBytes32String(input);
};

const defaultVersion = 1;
const claimManagerInterface = claimManagerABI;
const claimRevocationInterface = claimRevocationRegistryABI;

const initMockClaimManager = async () => {
  [owner] = await ethers.getSigners();

  //  Mocking claimManager
    const claimManagerMocked = await deployMockContract(
      owner,
      claimManagerInterface
    );

    const grantRole = async (operatorWallet, role) => {
      await claimManagerMocked.mock.hasRole
        .withArgs(operatorWallet.address, role, defaultVersion)
        .returns(true);
    };

    const revokeRole = async (operatorWallet, role) => {
      await claimManagerMocked.mock.hasRole
        .withArgs(operatorWallet.address, role, defaultVersion)
        .returns(false);
    };
  
  return {
    revokeRole,
    grantRole,
    claimManagerMocked,
  }
}

module.exports = {
  getMerkleProof,
  initMockClaimManager,
  claimManagerInterface,
  claimRevocationInterface,
};

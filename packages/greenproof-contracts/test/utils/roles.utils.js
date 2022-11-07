const { ethers } = require('hardhat');

const issuerRole = ethers.utils.namehash('minter.roles.greenproof.apps.iam.ewc');
const revokerRole = ethers.utils.namehash('revoker.roles.greenproof.apps.iam.ewc');
const workerRole = ethers.utils.namehash('workerRole.roles.greenproof.apps.iam.ewc');

const roles = {
  issuerRole,
  revokerRole,
  workerRole,
};

module.exports = { roles };